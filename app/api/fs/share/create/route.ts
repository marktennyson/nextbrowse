import { NextRequest, NextResponse } from "next/server";
import { safeResolve } from "@/lib/fs-helpers";
import * as fs from "fs/promises";
import { shares, createShareId } from "@/lib/shares";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      path,
      password,
      expiresIn,
      allowUploads,
      disableViewer,
      quickDownload,
      maxBandwidth,
      title,
      description,
      theme,
      viewMode,
    } = body;

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const safePath = safeResolve(path);
    if (!safePath) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Check if file/directory exists
    try {
      const stats = await fs.stat(safePath);
      const shareId = createShareId();

      const share = {
        id: shareId,
        path: safePath,
        type: stats.isDirectory() ? ("dir" as const) : ("file" as const),
        createdAt: Date.now(),
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
        password,
        allowUploads,
        disableViewer,
        quickDownload,
        maxBandwidth,
        title,
        description,
        theme,
        viewMode,
      };

      shares.set(shareId, share);

      return NextResponse.json({
        ok: true,
        shareId,
        shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/share/${shareId}`,
        share: {
          id: shareId,
          type: share.type,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
          hasPassword: !!password,
          allowUploads: share.allowUploads,
          disableViewer: share.disableViewer,
          quickDownload: share.quickDownload,
          title: share.title,
          description: share.description,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "File or directory not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error creating share:", error);
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}

// Get all shares (for management)
export async function GET() {
  try {
    const now = Date.now();
    const validShares = [];

    // Clean up expired shares
    for (const [id, share] of shares.entries()) {
      if (share.expiresAt && share.expiresAt < now) {
        shares.delete(id);
      } else {
        validShares.push({
          id: share.id,
          path: share.path,
          type: share.type,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
          hasPassword: !!share.password,
          allowUploads: share.allowUploads,
          disableViewer: share.disableViewer,
          quickDownload: share.quickDownload,
          title: share.title,
          description: share.description,
        });
      }
    }

    return NextResponse.json({ ok: true, shares: validShares });
  } catch (error) {
    console.error("Error getting shares:", error);
    return NextResponse.json(
      { error: "Failed to get shares" },
      { status: 500 }
    );
  }
}

// (shares exported from lib/shares)
