import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import { safeResolve } from "@/lib/fs-helpers";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    // Reconstruct the file path from the dynamic route segments
    const filePath = "/" + pathSegments.join("/");
    console.log("File serving request for:", filePath);
    
    const safePath = safeResolve(filePath);
    const stats = statSync(safePath);
    
    if (!stats.isFile()) {
      return new Response("Not a file", { status: 404 });
    }
    
    const fileName = path.basename(safePath);
    const fileStream = createReadStream(safePath);
    
    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };
    
    if (mimeTypes[ext]) {
      contentType = mimeTypes[ext];
    }
    
    // Create a ReadableStream from the file stream
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          controller.enqueue(new Uint8Array(buffer));
        });
        
        fileStream.on('end', () => {
          controller.close();
        });
        
        fileStream.on('error', (error) => {
          console.error('File stream error:', error);
          controller.error(error);
        });
      },
    });
    
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    });
    
    return new Response(readableStream, { headers });
    
  } catch (error) {
    console.error("File serving error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`File not found: ${errorMessage}`, { status: 404 });
  }
}