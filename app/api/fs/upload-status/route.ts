export const runtime = "nodejs";
import { promises as fsp } from "fs";
import path from "path";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function POST(req: Request) {
  try {
    const { fileId, fileName, pathParam } = await req.json();
    
    if (!fileId || !fileName) {
      return errorJSON("Missing required parameters", 400);
    }

    const dest = pathParam || "/";
    const destAbs = safeResolve(dest);
    const tempDir = path.join(destAbs, '.upload-temp');

    try {
      await fsp.access(tempDir);
    } catch {
      return new Response(JSON.stringify({ 
        ok: true,
        uploadedChunks: [],
        canResume: false
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find existing chunks for this file
    try {
      const existingChunks = await fsp.readdir(tempDir);
      const fileChunks = existingChunks
        .filter(name => name.startsWith(`${fileId}.`))
        .map(name => parseInt(name.split('.')[1]))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

      return new Response(JSON.stringify({ 
        ok: true,
        uploadedChunks: fileChunks,
        canResume: fileChunks.length > 0
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ 
        ok: true,
        uploadedChunks: [],
        canResume: false
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}