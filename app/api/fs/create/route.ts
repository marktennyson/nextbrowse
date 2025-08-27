export const runtime = "nodejs";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";
import { promises as fsp } from "fs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path: filePath, content = "" } = body;
    
    if (!filePath) {
      return errorJSON("Path parameter is required");
    }

    const abs = safeResolve(filePath);
    
    // Check if file already exists
    try {
      await fsp.access(abs);
      return errorJSON("File already exists");
    } catch {
      // File doesn't exist, which is what we want
    }
    
    await fsp.writeFile(abs, content, "utf8");
    
    const stats = await fsp.stat(abs);
    
    return new Response(JSON.stringify({ 
      ok: true,
      size: stats.size,
      mtime: stats.mtimeMs
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON(e instanceof Error ? e.message : String(e));
  }
}