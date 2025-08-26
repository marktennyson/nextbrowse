export const runtime = "nodejs";
import { promises as fsp } from "fs";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const target = body.path;
    if (!target) return errorJSON("Missing path", 400);
    
    const abs = safeResolve(target);
    
    // Check if directory already exists
    try {
      const stats = await fsp.stat(abs);
      if (stats.isDirectory()) {
        return errorJSON("Directory already exists", 409);
      } else {
        return errorJSON("A file exists with the same name", 409);
      }
    } catch {
      // Directory doesn't exist, proceed with creation
    }
    
    await fsp.mkdir(abs, { recursive: true });
    
    return new Response(JSON.stringify({ 
      ok: true,
      message: "Directory created successfully"
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
