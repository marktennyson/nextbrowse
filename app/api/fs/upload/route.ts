export const runtime = "nodejs";
import { promises as fsp } from "fs";
import path from "path";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const pathParam = formData.get("path") as string;
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return errorJSON("No files provided", 400);
    }

    const dest = pathParam || "/";
    const destAbs = safeResolve(dest);
    
    // Ensure destination directory exists
    await fsp.mkdir(destAbs, { recursive: true });

    const saved: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size === 0) {
        errors.push(`${file.name}: Empty file`);
        continue;
      }

      try {
        const fileName = file.name;
        const outPath = path.join(destAbs, fileName);
        
        // Check if file already exists
        try {
          await fsp.access(outPath);
          errors.push(`${fileName}: File already exists`);
          continue;
        } catch {
          // File doesn't exist, proceed with upload
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fsp.writeFile(outPath, buffer);
        saved.push(fileName);
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      files: saved,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${saved.length} file(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
