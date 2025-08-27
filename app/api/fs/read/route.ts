export const runtime = "nodejs";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";
import { promises as fsp } from "fs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("path");
    
    if (!filePath) {
      return errorJSON("Path parameter is required");
    }

    const abs = safeResolve(filePath);
    const stats = await fsp.stat(abs);
    
    if (stats.isDirectory()) {
      return errorJSON("Cannot read directory as file");
    }

    const content = await fsp.readFile(abs, "utf8");
    
    return new Response(JSON.stringify({ 
      ok: true, 
      content,
      size: stats.size,
      mtime: stats.mtimeMs
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON(e instanceof Error ? e.message : String(e));
  }
}