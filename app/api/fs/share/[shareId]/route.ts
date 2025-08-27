import { NextRequest, NextResponse } from "next/server";
import { shares } from "@/lib/shares";

export async function GET(request: NextRequest, context: unknown) {
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

    return NextResponse.json({
      ok: true,
      share: {
        id: share.id,
        type: share.type,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        allowUploads: share.allowUploads,
        disableViewer: share.disableViewer,
        quickDownload: share.quickDownload,
        title: share.title,
        description: share.description,
        theme: share.theme,
        viewMode: share.viewMode,
      },
    });
  } catch (error) {
    console.error("Error getting share:", error);
    return NextResponse.json({ error: "Failed to get share" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: unknown) {
  try {
    const ctx = context as { params?: { shareId?: string } } | undefined;
    const shareId = ctx?.params?.shareId;
    if (!shareId)
      return NextResponse.json({ error: "Missing shareId" }, { status: 400 });
    const share = shares.get(shareId);

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    shares.delete(shareId);
    return NextResponse.json({
      ok: true,
      message: "Share deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting share:", error);
    return NextResponse.json(
      { error: "Failed to delete share" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: unknown) {
  try {
    const ctx = context as { params?: { shareId?: string } } | undefined;
    const shareId = ctx?.params?.shareId;
    if (!shareId)
      return NextResponse.json({ error: "Missing shareId" }, { status: 400 });
    const share = shares.get(shareId);

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
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

    // Update share properties
    if (password !== undefined) share.password = password;
    if (expiresIn !== undefined) {
      share.expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
    }
    if (allowUploads !== undefined) share.allowUploads = allowUploads;
    if (disableViewer !== undefined) share.disableViewer = disableViewer;
    if (quickDownload !== undefined) share.quickDownload = quickDownload;
    if (maxBandwidth !== undefined) share.maxBandwidth = maxBandwidth;
    if (title !== undefined) share.title = title;
    if (description !== undefined) share.description = description;
    if (theme !== undefined) share.theme = theme;
    if (viewMode !== undefined) share.viewMode = viewMode;

    shares.set(shareId, share);

    return NextResponse.json({
      ok: true,
      share: {
        id: share.id,
        type: share.type,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        hasPassword: !!share.password,
        allowUploads: share.allowUploads,
        disableViewer: share.disableViewer,
        quickDownload: share.quickDownload,
        title: share.title,
        description: share.description,
        theme: share.theme,
        viewMode: share.viewMode,
      },
    });
  } catch (error) {
    console.error("Error updating share:", error);
    return NextResponse.json(
      { error: "Failed to update share" },
      { status: 500 }
    );
  }
}
