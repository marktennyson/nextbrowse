import { NextRequest, NextResponse } from "next/server";
import { shares } from "@/lib/shares";
import * as fs from "fs";
import * as path from "path";
import { createReadStream } from "fs";
import archiver from "archiver";

export async function GET(request: NextRequest, context: unknown) {
  try {
    const ctx = context as { params?: { shareId?: string } } | undefined;
    const shareId = ctx?.params?.shareId;
    if (!shareId)
      return NextResponse.json({ error: "Missing shareId" }, { status: 400 });
    const share = shares.get(shareId);

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      shares.delete(shareId as string);
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get("path");

    let targetPath = share.path;
    if (relativePath) {
      // For directory shares, allow downloading specific files
      if (share.type === "dir") {
        targetPath = path.join(share.path, relativePath);
        // Security check - ensure the path is within the shared directory
        if (!targetPath.startsWith(share.path)) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      } else {
        return NextResponse.json(
          { error: "Cannot access sub-paths for file shares" },
          { status: 400 }
        );
      }
    }

    // Check if target exists
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
      // Create ZIP archive for directory
      const fileName = `${path.basename(targetPath)}.zip`;

      const headers = new Headers();
      headers.set("Content-Type", "application/zip");
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);

      // Create archive stream
      const archive = archiver("zip", { zlib: { level: 9 } });

      // Convert Node.js stream to Web Stream
      const stream = new ReadableStream({
        start(controller) {
          archive.on("data", (chunk) => {
            const buf = Buffer.isBuffer(chunk)
              ? (chunk as Buffer)
              : Buffer.from(String(chunk));
            controller.enqueue(new Uint8Array(buf));
          });

          archive.on("end", () => {
            controller.close();
          });

          archive.on("error", (err) => {
            console.error("Archive error:", err);
            controller.error(err);
          });

          // Add directory contents to archive
          archive.directory(targetPath, path.basename(targetPath));
          archive.finalize();
        },
      });

      return new Response(stream, { headers });
    } else {
      // Stream file directly
      const fileName = path.basename(targetPath);
      const fileSize = stats.size;

      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
      headers.set("Content-Length", fileSize.toString());

      const fileStream = createReadStream(targetPath);

      // Convert Node.js ReadableStream to Web Stream
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => {
            const buf = Buffer.isBuffer(chunk)
              ? (chunk as Buffer)
              : Buffer.from(String(chunk));
            controller.enqueue(new Uint8Array(buf));
          });

          fileStream.on("end", () => {
            controller.close();
          });

          fileStream.on("error", (err) => {
            console.error("File stream error:", err);
            controller.error(err);
          });
        },
      });

      return new Response(stream, { headers });
    }
  } catch (error) {
    console.error("Error downloading share:", error);
    return NextResponse.json(
      { error: "Failed to download share" },
      { status: 500 }
    );
  }
}
