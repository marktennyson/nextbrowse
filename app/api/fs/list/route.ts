export const runtime = "nodejs";
import { safeResolve, errorJSON, PUBLIC_FILES_BASE, listDir } from "@/lib/fs-helpers";

interface NginxFileEntry {
  name: string;
  type: "file" | "directory";
  mtime: string;
  size?: number;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const p = url.searchParams.get("path") || "/";
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");
    
    // If no pagination parameters provided, return all items (for file tree)
    const usePagination = pageParam !== null || pageSizeParam !== null;
    const page = parseInt(pageParam || "1", 10);
    const pageSize = parseInt(pageSizeParam || "50", 10);

    if (usePagination) {
      // Validate pagination inputs
      if (page < 1) throw new Error("Page must be >= 1");
      if (pageSize < 1 || pageSize > 1000) throw new Error("Page size must be between 1 and 1000");
    }

    // Try nginx first, fallback to Node.js fs
    let items: Array<{
      name: string;
      type: "file" | "dir";
      size?: number;
      mtime: number;
      url?: string | null;
    }> = [];
    
    try {
      // Validate path using existing safety check
      safeResolve(p);

      // Try to fetch directory listing from nginx
      const nginxUrl = `http://nginx/api/fs/json-list${p}`;
      const response = await fetch(nginxUrl);
      
      if (response.ok) {
        const nginxData = await response.json();
        
        // Handle nginx autoindex JSON format - it can be an array directly or an object with directory name as key
        let entries: NginxFileEntry[] = [];
        
        if (Array.isArray(nginxData)) {
          entries = nginxData;
        } else if (typeof nginxData === 'object' && nginxData !== null) {
          // If it's an object, get the first key's value (directory listing)
          const keys = Object.keys(nginxData);
          if (keys.length > 0) {
            const firstKey = keys[0];
            if (Array.isArray(nginxData[firstKey])) {
              entries = nginxData[firstKey];
            }
          }
        }

        // If we got valid entries, transform them
        if (Array.isArray(entries)) {
          items = entries
            .filter(entry => entry.name !== "." && entry.name !== "..")
            .map(entry => ({
              name: entry.name,
              type: entry.type === "directory" ? "dir" as const : "file" as const,
              size: entry.type === "file" ? entry.size : undefined,
              mtime: new Date(entry.mtime).getTime(),
              url: entry.type === "file" 
                ? `${PUBLIC_FILES_BASE}${p.endsWith("/") ? p : p + "/"}${entry.name}`
                : null,
            }))
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
              return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
        } else {
          throw new Error("Invalid nginx response format");
        }
      } else {
        throw new Error(`Nginx response: ${response.status}`);
      }
    } catch (nginxError) {
      console.log("Nginx listing failed, falling back to Node.js fs:", nginxError);
      
      // Fallback to Node.js fs
      const data = await listDir(p);
      items = data.items as typeof items;
    }

    if (!usePagination) {
      // Return all items without pagination (for file tree)
      return new Response(JSON.stringify({ 
        ok: true, 
        path: p,
        items
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Apply pagination
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    return new Response(JSON.stringify({ 
      ok: true, 
      path: p,
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return errorJSON((e instanceof Error ? e.message : String(e)));
  }
}
