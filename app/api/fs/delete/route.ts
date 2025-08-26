export const runtime = "nodejs";
import { promises as fsp } from "fs";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function DELETE(req: Request) {
  return handleDelete(req);
}

export async function POST(req: Request) {
  return handleDelete(req);
}

async function handleDelete(req: Request) {
  try {
    const body = await req.json();
    const p = body.path;
    if (!p) return errorJSON("Missing path", 400);
    
    const abs = safeResolve(p);
    
    // Check if file/directory exists
    try {
      await fsp.access(abs);
    } catch {
      return errorJSON("File or directory not found", 404);
    }
    
    // Get file stats to determine if it's a file or directory
    const stats = await fsp.stat(abs);
    const isDirectory = stats.isDirectory();
    
    await fsp.rm(abs, { recursive: true, force: true });
    
    return new Response(JSON.stringify({ 
      ok: true,
      message: `${isDirectory ? 'Directory' : 'File'} deleted successfully`
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
