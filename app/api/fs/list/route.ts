export const runtime = "nodejs";
import {
  safeResolve,
  errorJSON,
  listDir,
  encodePathForUrl,
  buildPublicFileUrl,
} from "@/lib/fs-helpers";

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
    const offsetParam = url.searchParams.get("offset");
    const limitParam = url.searchParams.get("limit");

    // Support both page-based and offset-based pagination
    const useOffsetPagination = offsetParam !== null || limitParam !== null;
    const usePagination =
      pageParam !== null || pageSizeParam !== null || useOffsetPagination;

    let page = 1;
    let pageSize = 50;
    let offset = 0;
    let limit = 50;

    if (useOffsetPagination) {
      offset = parseInt(offsetParam || "0", 10);
      limit = parseInt(limitParam || "50", 10);
      // Validate offset-based inputs
      if (offset < 0) throw new Error("Offset must be >= 0");
      if (limit < 1 || limit > 1000)
        throw new Error("Limit must be between 1 and 1000");
    } else {
      page = parseInt(pageParam || "1", 10);
      pageSize = parseInt(pageSizeParam || "50", 10);
      if (usePagination) {
        // Validate page-based inputs
        if (page < 1) throw new Error("Page must be >= 1");
        if (pageSize < 1 || pageSize > 1000)
          throw new Error("Page size must be between 1 and 1000");
      }
      // Convert page-based to offset-based
      offset = (page - 1) * pageSize;
      limit = pageSize;
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

      // Try to fetch directory listing from nginx (ensure path is URL-encoded per segment)
      const nginxUrl = `http://nginx/api/fs/json-list${encodePathForUrl(p)}`;
      const response = await fetch(nginxUrl);

      if (response.ok) {
        const nginxData = await response.json();

        // Handle nginx autoindex JSON format - it can be an array directly or an object with directory name as key
        let entries: NginxFileEntry[] = [];

        if (Array.isArray(nginxData)) {
          entries = nginxData;
        } else if (typeof nginxData === "object" && nginxData !== null) {
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
            .filter((entry) => entry.name !== "." && entry.name !== "..")
            .map((entry) => ({
              name: entry.name,
              type:
                entry.type === "directory"
                  ? ("dir" as const)
                  : ("file" as const),
              size: entry.type === "file" ? entry.size : undefined,
              mtime: new Date(entry.mtime).getTime(),
              url:
                entry.type === "file"
                  ? buildPublicFileUrl(
                      `${p.endsWith("/") ? p : p + "/"}${entry.name}`
                    )
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
      console.log(
        "Nginx listing failed, falling back to Node.js fs:",
        nginxError
      );

      // Fallback to Node.js fs
      const data = await listDir(p);
      items = data.items as typeof items;
    }

    if (!usePagination) {
      // Return all items without pagination (for file tree)
      return new Response(
        JSON.stringify({
          ok: true,
          path: p,
          items,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Apply pagination
    const totalItems = items.length;
    const startIndex = offset;
    const endIndex = Math.min(startIndex + limit, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    const hasMore = endIndex < totalItems;

    return new Response(
      JSON.stringify({
        ok: true,
        path: p,
        items: paginatedItems,
        pagination: useOffsetPagination
          ? {
              offset,
              limit,
              totalItems,
              hasMore,
              nextOffset: hasMore ? endIndex : null,
            }
          : {
              page: Math.floor(offset / limit) + 1,
              pageSize: limit,
              totalItems,
              totalPages: Math.ceil(totalItems / limit),
              hasNext: hasMore,
              hasPrev: offset > 0,
            },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: unknown) {
    return errorJSON(e instanceof Error ? e.message : String(e));
  }
}
