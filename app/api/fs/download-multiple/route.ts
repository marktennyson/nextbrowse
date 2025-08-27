import { NextRequest } from "next/server";
import { statSync } from "fs";
import { safeResolve } from "@/lib/fs-helpers";
import archiver from "archiver";

interface DownloadItem {
  name: string;
  path: string;
}

interface DownloadMultipleRequest {
  items: DownloadItem[];
  basePath: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadMultipleRequest = await request.json();
    const { items } = body;
    
    if (!items || items.length === 0) {
      return new Response("No items provided", { status: 400 });
    }

    console.log('Multiple download request for items:', items.map(i => i.name));
    
    // Create ZIP archive name
    const archiveName = items.length === 1 
      ? `${items[0].name}.zip` 
      : `selected-items-${Date.now()}.zip`;
    
    // Set headers for zip download
    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archiveName}"`,
      "Cache-Control": "no-cache",
    });
    
    // Create archiver instance outside ReadableStream
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Compression level (0-9, 6 is good balance)
    });
    
    // Create a readable stream for the zip
    const readableStream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        
        const cleanup = () => {
          if (!isClosed) {
            try {
              archive.abort();
            } catch (e) {
              console.error('Archive cleanup error:', e);
            }
            isClosed = true;
          }
        };
        
        // Handle archive events
        archive.on("error", (err) => {
          if (!isClosed) {
            console.error("Archive error:", err);
            try {
              controller.error(err);
            } catch (e) {
              console.error("Controller error reporting failed:", e);
            } finally {
              cleanup();
            }
          }
        });
        
        archive.on("data", (chunk) => {
          if (isClosed) return;
          try {
            controller.enqueue(new Uint8Array(chunk));
          } catch (error) {
            if (!isClosed) {
              console.error("Stream enqueue error:", error);
              cleanup();
            }
          }
        });
        
        archive.on("end", () => {
          if (!isClosed) {
            try {
              controller.close();
            } catch (error) {
              console.error("Stream close error:", error);
            } finally {
              isClosed = true;
            }
          }
        });
        
        // Start the archive process after setting up event handlers
        Promise.resolve().then(() => {
          try {
            for (const item of items) {
              const safePath = safeResolve(item.path);
              const stats = statSync(safePath);
              
              if (stats.isFile()) {
                // Add file to archive
                archive.file(safePath, { name: item.name });
              } else if (stats.isDirectory()) {
                // Add directory to archive (with all its contents)
                archive.directory(safePath, item.name);
              }
            }
            
            // Finalize the archive
            archive.finalize();
          } catch (error) {
            console.error("Error adding files to archive:", error);
            archive.emit("error", error);
          }
        });
      },
      cancel() {
        // Clean up when client disconnects
        try {
          archive.abort();
        } catch (e) {
          console.error('Archive abort error:', e);
        }
      }
    });
    
    return new Response(readableStream, { headers });
    
  } catch (error) {
    console.error("Download multiple error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Internal server error: ${errorMessage}`, { status: 500 });
  }
}