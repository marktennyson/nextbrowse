export const runtime = "nodejs";
import { promises as fsp } from "fs";
import path from "path";
import { safeResolve, errorJSON } from "@/lib/fs-helpers";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const pathParam = formData.get("path") as string;
    const fileName = formData.get("fileName") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const fileId = formData.get("fileId") as string;
    const chunk = formData.get("chunk") as File;
    
    if (!chunk || !fileName || isNaN(chunkIndex) || isNaN(totalChunks) || !fileId) {
      return errorJSON("Missing required parameters", 400);
    }

    const dest = pathParam || "/";
    const destAbs = safeResolve(dest);
    
    // Create destination directory and temp directory for chunks
    await fsp.mkdir(destAbs, { recursive: true });
    const tempDir = path.join(destAbs, '.upload-temp');
    await fsp.mkdir(tempDir, { recursive: true });

    // Save chunk
    const chunkPath = path.join(tempDir, `${fileId}.${chunkIndex}`);
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fsp.writeFile(chunkPath, buffer);

    // Check if all chunks are uploaded
    const existingChunks = await fsp.readdir(tempDir);
    const fileChunks = existingChunks.filter(name => name.startsWith(`${fileId}.`));
    
    if (fileChunks.length === totalChunks) {
      // All chunks received, assemble the file
      const finalPath = path.join(destAbs, fileName);
      
      // Check if file already exists
      try {
        await fsp.access(finalPath);
        // Clean up chunks
        for (let i = 0; i < totalChunks; i++) {
          try {
            await fsp.unlink(path.join(tempDir, `${fileId}.${i}`));
          } catch {}
        }
        return errorJSON(`File ${fileName} already exists`, 409);
      } catch {
        // File doesn't exist, proceed
      }

      // Assemble chunks in order
      const writeStream = await fsp.open(finalPath, 'w');
      
      try {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(tempDir, `${fileId}.${i}`);
          const chunkBuffer = await fsp.readFile(chunkPath);
          await writeStream.write(chunkBuffer);
          await fsp.unlink(chunkPath); // Clean up chunk after writing
        }
      } finally {
        await writeStream.close();
      }

      return new Response(JSON.stringify({ 
        ok: true, 
        complete: true,
        fileName,
        message: `Successfully uploaded ${fileName}`
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // More chunks needed
      return new Response(JSON.stringify({ 
        ok: true, 
        complete: false,
        chunkIndex,
        received: fileChunks.length,
        total: totalChunks
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}