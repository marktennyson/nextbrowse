export const runtime = "nodejs";
import { listDir, errorJSON } from "@/lib/fs-helpers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const p = url.searchParams.get("path") || "/";
    const data = await listDir(p);
    return new Response(JSON.stringify({ ok: true, ...data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
