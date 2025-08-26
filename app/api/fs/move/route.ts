export const runtime = "nodejs";
import { promises as fsp } from "fs";
import path from "path";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function POST(req: Request) {
  try {
    const { source, destination } = await req.json();
    if (!source || !destination) return errorJSON("Missing source/destination", 400);
    
    const absFrom = safeResolve(source);
    const absTo = safeResolve(destination);
    
    // Check if source exists
    try {
      await fsp.access(absFrom);
    } catch {
      return errorJSON("Source file or directory not found", 404);
    }
    
    // Check if destination already exists
    try {
      await fsp.access(absTo);
      return errorJSON("Destination already exists", 409);
    } catch {
      // Destination doesn't exist, proceed with move
    }
    
    // Ensure destination directory exists
    await fsp.mkdir(path.dirname(absTo), { recursive: true });
    
    await fsp.rename(absFrom, absTo);
    
    return new Response(JSON.stringify({ 
      ok: true,
      message: "File/directory moved successfully"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
