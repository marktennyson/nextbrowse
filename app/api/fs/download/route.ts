import { NextRequest } from "next/server";
import { statSync, createReadStream } from "fs";
import { safeResolve } from "@/lib/fs-helpers";
import archiver from "archiver";
import path from "path";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return new Response("Path parameter is required", { status: 400 });
  }

  try {
    console.log("Download request for path:", filePath);
    const safePath = safeResolve(filePath);
    console.log("Resolved safe path:", safePath);
    const stats = statSync(safePath);
    console.log("File stats:", {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
    });

    if (stats.isFile()) {
      // For files, serve directly with download headers to force download
      const fileName = path.basename(safePath);
      const fileStream = createReadStream(safePath);

      // Create a ReadableStream from the file stream
      const readableStream = new ReadableStream({
        start(controller) {
          let isClosed = false;

          const cleanup = () => {
            if (!isClosed) {
              try {
                fileStream.destroy();
              } catch {
                // ignore
              }
              isClosed = true;
            }
          };

          fileStream.on("data", (chunk) => {
            if (isClosed) return;
            try {
              const buffer = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(chunk);
              // Guard enqueue in try/catch because controller may be closed concurrently
              controller.enqueue(new Uint8Array(buffer));
            } catch (error) {
              // If enqueue fails because controller is closed, just cleanup
              if (!isClosed) {
                console.error("Stream enqueue error:", error);
                cleanup();
              }
            }
          });

          fileStream.on("end", () => {
            if (!isClosed) {
              // mark closed before calling controller to avoid races where a pending
              // 'data' callback enqueues after controller.close() has been called
              isClosed = true;
              try {
                controller.close();
              } catch (error) {
                console.error("Stream close error:", error);
              }
            }
          });

          fileStream.on("error", (error) => {
            if (!isClosed) {
              console.error("File stream error:", error);
              // mark closed before erroring the controller to avoid races
              isClosed = true;
              try {
                controller.error(error);
              } catch (e) {
                console.error("Stream error reporting failed:", e);
              } finally {
                cleanup();
              }
            }
          });
        },
        cancel() {
          fileStream.destroy();
        },
      });

      const headers = new Headers({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Accept-Ranges": "bytes",
      });

      console.log("Serving file directly with download headers:", fileName);
      return new Response(readableStream, { headers });
    }

    if (stats.isDirectory()) {
      // For directories, create on-the-fly zip compression
      const folderName = filePath.split("/").pop() || "archive";
      const zipName = `${folderName}.zip`;

      // Set headers for zip download
      const headers = new Headers({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
        "Cache-Control": "no-cache",
      });

      // Create a readable stream for the zip
      const readableStream = new ReadableStream({
        start(controller) {
          const archive = archiver("zip", {
            zlib: { level: 6 }, // Compression level (0-9, 6 is good balance)
          });

          let isClosed = false;

          // Handle archive events
          archive.on("error", (err) => {
            if (!isClosed) {
              console.error("Archive error:", err);
              isClosed = true; // mark before calling controller.error to avoid races
              try {
                controller.error(err);
              } catch (e) {
                console.error("Archive controller.error failed:", e);
              }
            }
          });

          archive.on("data", (chunk) => {
            if (isClosed) return;
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch (e) {
              if (!isClosed) {
                console.error("Archive enqueue error:", e);
                isClosed = true;
                try {
                  controller.error(e);
                } catch {
                  // ignore
                }
              }
            }
          });

          archive.on("end", () => {
            if (!isClosed) {
              isClosed = true;
              try {
                controller.close();
              } catch (e) {
                console.error("Archive controller.close failed:", e);
              }
            }
          });

          // Add directory contents to archive
          archive.directory(safePath, false);
          archive.finalize();
        },
      });

      return new Response(readableStream, { headers });
    }

    return new Response("Path not found", { status: 404 });
  } catch (error) {
    console.error("Download error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(`Internal server error: ${errorMessage}`, {
      status: 500,
    });
  }
}
