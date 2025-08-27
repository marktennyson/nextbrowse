import { promises as fsp } from "fs";
import path from "path";

const ROOT = process.env.ROOT_PATH || process.env.ROOT_DIR || "/app/static";
export const PUBLIC_FILES_BASE = "/files";

export function safeResolve(userPath = "/") {
  // Normalize, join with ROOT, and ensure it stays inside ROOT
  const rel = userPath || "/";
  const joined = path.join(ROOT, rel);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(path.normalize(ROOT))) {
    throw new Error("Path traversal blocked");
  }
  return normalized;
}

export async function listDir(userPath = "/") {
  const abs = safeResolve(userPath);
  const entries = await fsp.readdir(abs, { withFileTypes: true });
  const items = await Promise.all(
    entries.map(async (e) => {
      const full = path.join(abs, e.name);
      const s = await fsp.stat(full);
      const relPath = path.posix.join(userPath, e.name).replace(/\\\\/g, "/");
      return {
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
        size: e.isDirectory() ? undefined : s.size,
        mtime: s.mtimeMs,
        url: e.isDirectory() ? null : buildPublicFileUrl(relPath),
      };
    })
  );

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
  return { path: userPath || "/", items };
}

export function errorJSON(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Encode a file system path for safe use in URLs, preserving slashes between segments
export function encodePathForUrl(userPath: string = "/"): string {
  const parts = (userPath || "/").split("/").filter(Boolean);
  // Always ensure a single leading slash
  const encoded = parts.map(encodeURIComponent).join("/");
  return "/" + encoded;
}

// Build a public URL under /files for a given user path, with proper encoding
export function buildPublicFileUrl(userPath: string): string {
  return `${PUBLIC_FILES_BASE}${encodePathForUrl(userPath)}`;
}
