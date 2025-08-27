import { NextRequest, NextResponse } from "next/server";
import { shares } from "@/lib/shares";
import * as fs from "fs/promises";
import * as path from "path";

export async function POST(request: NextRequest, context: unknown) {
  try {
    const ctx = context as { params?: { shareId?: string } } | undefined;
    const shareId = ctx?.params?.shareId;
    if (!shareId)
      return NextResponse.json({ error: "Missing shareId" }, { status: 400 });

    const share = shares.get(shareId);

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check if share has expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      shares.delete(shareId);
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    const body = await request.json();
    const { password } = body;

    // Check password if required
    if (share.password && share.password !== password) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Return share content
    try {
      const stats = await fs.stat(share.path);

      if (stats.isDirectory()) {
        // List directory contents
        const entries = await fs.readdir(share.path, { withFileTypes: true });
        const items = await Promise.all(
          entries.map(async (entry) => {
            const itemPath = path.join(share.path, entry.name);
            const itemStats = await fs.stat(itemPath);
            return {
              name: entry.name,
              type: entry.isDirectory() ? "dir" : "file",
              size: entry.isFile() ? itemStats.size : undefined,
              mtime: itemStats.mtime.getTime(),
              url: entry.isFile()
                ? `/api/fs/share/${shareId}/download?path=${encodeURIComponent(
                    entry.name
                  )}`
                : null,
            };
          })
        );

        return NextResponse.json({
          ok: true,
          type: "dir",
          path: path.basename(share.path),
          items,
          shareConfig: {
            allowUploads: share.allowUploads,
            disableViewer: share.disableViewer,
            quickDownload: share.quickDownload,
            title: share.title,
            description: share.description,
            theme: share.theme,
            viewMode: share.viewMode,
          },
        });
      } else {
        // File info
        return NextResponse.json({
          ok: true,
          type: "file",
          name: path.basename(share.path),
          size: stats.size,
          mtime: stats.mtime.getTime(),
          downloadUrl: `/api/fs/share/${shareId}/download`,
          shareConfig: {
            disableViewer: share.disableViewer,
            quickDownload: share.quickDownload,
            title: share.title,
            description: share.description,
            theme: share.theme,
          },
        });
      }
    } catch {
      return NextResponse.json(
        { error: "Shared content not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error accessing share:", error);
    return NextResponse.json(
      { error: "Failed to access share" },
      { status: 500 }
    );
  }
}
