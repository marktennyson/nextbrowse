"use client";

import React, { useState, useEffect, useCallback } from "react";
import FileList from "@/components/FileList";
import Toolbar from "@/components/Toolbar";
import UploadDropzone from "@/components/UploadDropzone";
import GlobalDropzone from "@/components/GlobalDropzone";
import { FileValidator } from "@/lib/file-validator";
import { handleErrorResponse } from "@/lib/api-helpers";
import { apiClient } from "@/lib/api-client";
import Header from "./Header";
import ErrorMessage from "./ErrorMessage";
import EmptyState from "./EmptyState";
import LoadingSpinner from "./LoadingSpinner";
import DialogsContainer from "./DialogsContainer";
import { useFileOperations } from "./FileOperationsProvider";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import { isAudioFile } from "@/lib/audio-utils";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface DirectoryData {
  ok: boolean;
  path: string;
  items: FileItem[];
  error?: string;
  pagination?: {
    // Page-based pagination (legacy)
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    // Offset-based pagination (for infinite scroll)
    offset?: number;
    limit?: number;
    totalItems: number;
    hasMore?: boolean;
    nextOffset?: number | null;
  };
}

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "kind" | "size" | "date">(
    "kind"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [allItems, setAllItems] = useState<FileItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_LOAD = 50;

  const {
    moveCopyDialog,
    confirmDialog,
    contextMenu,
    imageViewer,
    renameDialog,
    propertiesDialog,
    shareDialog,
    setMoveCopyDialog,
    setConfirmDialog,
    handleContextMenu,
    closeContextMenu,
    openImageViewer,
    closeImageViewer,
    navigateImageViewer,
    openRenameDialog,
    closeRenameDialog,
    openPropertiesDialog,
    closePropertiesDialog,
    openShareDialog,
    closeShareDialog,
  } = useFileOperations();

  const { playTrack, playFromSelection, playFolder } = useMusicPlayer();

  // Load directory contents with infinite scroll
  const loadDirectory = useCallback(
    async (path: string, reset: boolean = false, offset: number = 0) => {
      if (reset) {
        setLoading(true);
        setAllItems([]);
        setCurrentOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const data = (await apiClient.listDirectory(path, {
          offset,
          limit: ITEMS_PER_LOAD,
        })) as DirectoryData;

        if (data.ok) {
          if (reset) {
            setAllItems(data.items);
          } else {
            setAllItems((prev) => [...prev, ...data.items]);
          }
          setCurrentPath(data.path);
          setHasMore(data.pagination?.hasMore || false);
          setCurrentOffset(
            data.pagination?.nextOffset || offset + data.items.length
          );
        } else {
          setError(data.error || "Failed to load directory");
        }
      } catch {
        setError("Network error while loading directory");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [ITEMS_PER_LOAD]
  );

  // Load more items for infinite scroll
  const loadMoreItems = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadDirectory(currentPath, false, currentOffset);
    }
  }, [currentPath, currentOffset, hasMore, loadingMore, loadDirectory]);

  // Initialize
  useEffect(() => {
    loadDirectory(currentPath, true, 0);
  }, [loadDirectory, currentPath]);

  // Navigation
  const navigate = useCallback(
    (path: string) => {
      const newPath = path.startsWith("/")
        ? path
        : `${currentPath}/${path}`.replace(/\/+/g, "/");
      setCurrentPath(newPath);
      setSelectedItems(new Set());
      setHighlightedItem(null);
      setAllItems([]);
      setCurrentOffset(0);
      setHasMore(true);
    },
    [currentPath]
  );

  const navigateUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    const newPath = parts.length > 0 ? "/" + parts.slice(0, -1).join("/") : "/";
    navigate(newPath);
  }, [currentPath, navigate]);

  // File selection
  const selectItem = useCallback((item: FileItem, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(item.name);
      } else {
        newSet.delete(item.name);
      }
      return newSet;
    });
  }, []);

  // File highlighting (visual only, not actual selection)
  const highlightItem = useCallback((item: FileItem | null) => {
    setHighlightedItem(item?.name || null);
  }, []);

  // Filtering and sorting
  const filteredItems = allItems
    .filter((item) => {
      if (!showHidden && item.name.startsWith(".")) return false;
      if (!searchQuery) return true;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
          });
          break;
        case "kind":
          if (a.type !== b.type) {
            comparison = a.type === "dir" ? -1 : 1;
          } else {
            comparison = a.name.localeCompare(b.name, undefined, {
              numeric: true,
            });
          }
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case "date":
          comparison = a.mtime - b.mtime;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Count audio files
  const audioFiles = filteredItems.filter(isAudioFile);
  const selectedAudioFiles = Array.from(selectedItems)
    .map((name) => filteredItems.find((item) => item.name === name))
    .filter(
      (item): item is FileItem => item !== undefined && isAudioFile(item)
    );

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map((item) => item.name)));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Audio playback handlers
  const handlePlayAllAudio = useCallback(() => {
    if (audioFiles.length > 0) {
      playFolder(audioFiles, currentPath);
    }
  }, [audioFiles, currentPath, playFolder]);

  const handlePlaySelectedAudio = useCallback(() => {
    if (selectedAudioFiles.length > 0) {
      playFromSelection(selectedAudioFiles, currentPath);
    }
  }, [selectedAudioFiles, currentPath, playFromSelection]);

  // Handle double-click on audio file
  const handleAudioPlay = useCallback(
    (item: FileItem) => {
      const audioTrack = {
        name: item.name.replace(/\.[^/.]+$/, ""),
        url: item.url || `${currentPath}/${item.name}`.replace(/\/+/g, "/"),
        path: `${currentPath}/${item.name}`.replace(/\/+/g, "/"),
        duration: undefined,
      };
      playTrack(audioTrack, filteredItems, currentPath);
    },
    [currentPath, filteredItems, playTrack]
  );

  // File operations
  const deleteSelected = useCallback(async () => {
    const itemsToDelete = Array.from(selectedItems);

    try {
      for (const itemName of itemsToDelete) {
        const itemPath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
        const response = await fetch("/api/fs/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: itemPath }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        }
      }

      await loadDirectory(currentPath, true, 0);
      setSelectedItems(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete operation failed");
    }
  }, [selectedItems, currentPath, loadDirectory]);

  const downloadSelected = useCallback(async () => {
    const itemsToDownload = Array.from(selectedItems);

    if (itemsToDownload.length === 0) return;

    if (itemsToDownload.length === 1) {
      // Single item download
      const itemName = itemsToDownload[0];
      const itemPath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
      const downloadUrl = `/api/fs/download?path=${encodeURIComponent(
        itemPath
      )}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      const item = allItems.find((i) => i.name === itemName);
      link.download = item?.type === "dir" ? `${itemName}.zip` : itemName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Multiple items download - create a temporary ZIP
      const zipName = `${
        allItems.length > 1 ? "selected-items" : "download"
      }.zip`;

      try {
        const response = await fetch("/api/fs/download-multiple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsToDownload.map((itemName) => ({
              name: itemName,
              path: `${currentPath}/${itemName}`.replace(/\/+/g, "/"),
            })),
            basePath: currentPath,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = zipName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error("Failed to create download archive");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      }
    }

    // Clear selection after download
    setSelectedItems(new Set());
  }, [selectedItems, currentPath, allItems]);

  const handleMoveCopy = useCallback(
    async (targetPath: string) => {
      const { mode, items } = moveCopyDialog;

      try {
        for (const itemName of items) {
          const sourcePath = `${currentPath}/${itemName}`.replace(/\/+/g, "/");
          const response = await fetch(`/api/fs/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: sourcePath,
              destination: `${targetPath}/${itemName}`.replace(/\/+/g, "/"),
            }),
          });

          if (!response.ok) {
            await handleErrorResponse(response);
          }
        }

        await loadDirectory(currentPath, true, 0);
        setSelectedItems(new Set());
        setMoveCopyDialog({ open: false, mode: "move", items: [] });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `${mode} operation failed`
        );
      }
    },
    [moveCopyDialog, currentPath, loadDirectory, setMoveCopyDialog]
  );

  const createFolder = useCallback(
    async (folderName: string) => {
      try {
        const folderPath = `${currentPath}/${folderName}`.replace(/\/+/g, "/");
        const response = await fetch("/api/fs/mkdir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: folderPath }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        }

        await loadDirectory(currentPath, true, 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create folder failed");
      }
    },
    [currentPath, loadDirectory]
  );

  // File upload with validation: delegate actual upload to UploadDropzone's UploadManager via CustomEvent
  const handleUpload = useCallback(async (files: FileList) => {
    const validation = FileValidator.validate(files, {
      maxFileSize: 100 * 1024 * 1024 * 1024, // 100GB
      maxFiles: 5000,
      requireUniqueNames: false,
    });

    if (!validation.valid) {
      setError(`Upload validation failed: ${validation.errors.join(", ")}`);
      return;
    }
    if (validation.warnings.length > 0) {
      console.warn("Upload warnings:", validation.warnings);
    }

    // Dispatch to UploadDropzone which listens for this event and uses UploadManager
    const evt = new CustomEvent<FileList>("fileUpload", { detail: files });
    document.dispatchEvent(evt);
  }, []);

  // Enhanced upload complete handler
  const handleUploadComplete = useCallback(() => {
    loadDirectory(currentPath, true, 0);
  }, [currentPath, loadDirectory]);

  const handleRename = useCallback(
    async (newName: string) => {
      if (!renameDialog.item) return;

      const item = renameDialog.item;
      const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");
      const newPath = `${currentPath}/${newName}`.replace(/\/+/g, "/");

      try {
        const response = await fetch("/api/fs/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: itemPath,
            destination: newPath,
          }),
        });

        if (!response.ok) {
          await handleErrorResponse(response);
        } else {
          await loadDirectory(currentPath, true, 0);
          closeRenameDialog();
        }
      } catch {
        setError("Failed to rename item");
      }
    },
    [renameDialog.item, currentPath, loadDirectory, closeRenameDialog]
  );

  // Create share handler
  const handleCreateShare = useCallback(
    async (shareData: {
      path: string;
      password?: string;
      expiresIn?: number;
      allowUploads?: boolean;
      disableViewer?: boolean;
      quickDownload?: boolean;
      title?: string;
      description?: string;
      theme?: string;
      viewMode?: "list" | "grid";
    }) => {
      try {
        const response = await fetch("/api/fs/share/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shareData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create share");
        }

        const data = await response.json();
        return {
          shareId: data.shareId,
          shareUrl: data.shareUrl,
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create share");
        return null;
      }
    },
    []
  );

  // File edit handler
  const handleFileEdit = useCallback(
    (item: FileItem) => {
      const filePath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");
      const encodedPath = encodeURIComponent(filePath);
      window.open(`/ide?file=${encodedPath}`, "_blank");
    },
    [currentPath]
  );

  // Context menu action handler
  const handleContextMenuAction = useCallback(
    async (action: string) => {
      const item = contextMenu.item;
      closeContextMenu();
      if (!item) return;
      const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");

      try {
        switch (action) {
          case "play":
            if (isAudioFile(item)) {
              const audioTrack = {
                name: item.name.replace(/\.[^/.]+$/, ""),
                url: item.url || itemPath,
                path: itemPath,
                duration: undefined,
              };
              playTrack(audioTrack, filteredItems, currentPath);
            }
            break;

          case "open":
            if (item.type === "dir") {
              navigate(item.name);
            } else if (item.url) {
              window.open(item.url, "_blank");
            }
            break;

          case "openWithIDE":
            if (item.type === "dir") {
              const encodedPath = encodeURIComponent(itemPath);
              window.open(`/ide?folder=${encodedPath}`, "_blank");
            }
            break;

          case "download":
            // Use the new download API for both files and folders
            const downloadUrl = `/api/fs/download?path=${encodeURIComponent(
              itemPath
            )}`;
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download =
              item.type === "dir" ? `${item.name}.zip` : item.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            break;

          case "copy":
            setMoveCopyDialog({
              open: true,
              mode: "copy",
              items: [item.name],
            });
            break;

          case "move":
            setMoveCopyDialog({
              open: true,
              mode: "move",
              items: [item.name],
            });
            break;

          case "rename":
            openRenameDialog(item);
            break;

          case "delete":
            setConfirmDialog({
              open: true,
              title: "Delete Item",
              message: `Are you sure you want to delete "${item.name}"?`,
              onConfirm: async () => {
                try {
                  const response = await fetch("/api/fs/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: itemPath }),
                  });

                  if (!response.ok) {
                    await handleErrorResponse(response);
                  } else {
                    await loadDirectory(currentPath, true, 0);
                  }
                } catch {
                  setError("Failed to delete item");
                }
              },
            });
            break;

          case "properties":
            openPropertiesDialog(item);
            break;

          case "share":
            openShareDialog(item);
            break;

          default:
            break;
        }
      } catch {
        setError(`Failed to perform ${action} operation`);
      }
    },
    [
      contextMenu.item,
      currentPath,
      navigate,
      setMoveCopyDialog,
      openRenameDialog,
      setConfirmDialog,
      loadDirectory,
      openPropertiesDialog,
      openShareDialog,
      closeContextMenu,
      playTrack,
      filteredItems,
    ]
  ); // Show loading spinner if initial load
  if (loading && allItems.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen relative" onClick={closeContextMenu}>
      <Header
        currentPath={currentPath}
        filteredItemsCount={filteredItems.length}
        selectedItemsCount={selectedItems.size}
        searchQuery={searchQuery}
        onNavigate={navigate}
        onSearchChange={setSearchQuery}
      />

      <div className="max-w-full mx-auto px-3 sm:px-4 py-3">
        <Toolbar
          selectedCount={selectedItems.size}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          showHidden={showHidden}
          audioCount={audioFiles.length}
          selectedAudioCount={selectedAudioFiles.length}
          onViewModeChange={setViewMode}
          onSortChange={(by: string, order: string) => {
            setSortBy(by as "name" | "kind" | "size" | "date");
            setSortOrder(order as "asc" | "desc");
          }}
          onToggleHidden={() => setShowHidden(!showHidden)}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onDelete={() => {
            if (selectedItems.size > 0) {
              setConfirmDialog({
                open: true,
                title: "Delete Items",
                message: `Are you sure you want to delete ${selectedItems.size} item(s)?`,
                onConfirm: deleteSelected,
              });
            }
          }}
          onMove={() => {
            if (selectedItems.size > 0) {
              setMoveCopyDialog({
                open: true,
                mode: "move",
                items: Array.from(selectedItems),
              });
            }
          }}
          onCopy={() => {
            if (selectedItems.size > 0) {
              setMoveCopyDialog({
                open: true,
                mode: "copy",
                items: Array.from(selectedItems),
              });
            }
          }}
          onDownload={() => {
            if (selectedItems.size > 0) {
              downloadSelected();
            }
          }}
          onCreateFolder={(name: string) => createFolder(name)}
          onRefresh={() => loadDirectory(currentPath, true, 0)}
          onNavigateUp={navigateUp}
          onPlayAllAudio={handlePlayAllAudio}
          onPlaySelectedAudio={handlePlaySelectedAudio}
          canNavigateUp={currentPath !== "/"}
        />

        {error && <ErrorMessage error={error} onClose={() => setError(null)} />}

        <UploadDropzone
          onUploadComplete={handleUploadComplete}
          targetPath={currentPath}
        >
          <GlobalDropzone onFilesDropped={handleUpload} enabled={!loading} />
          <FileList
            items={filteredItems}
            selectedItems={selectedItems}
            highlightedItem={highlightedItem}
            viewMode={viewMode}
            onNavigate={navigate}
            onSelect={selectItem}
            onHighlight={highlightItem}
            onContextMenu={handleContextMenu}
            onImageClick={(item) => openImageViewer(item, filteredItems)}
            onFileEdit={handleFileEdit}
            onAudioPlay={handleAudioPlay}
            loading={loading}
            hasMore={hasMore && !searchQuery}
            onLoadMore={loadMoreItems}
            loadingMore={loadingMore}
          />
        </UploadDropzone>

        {filteredItems.length === 0 && !loading && (
          <EmptyState searchQuery={searchQuery} />
        )}
      </div>

      <DialogsContainer
        moveCopyDialog={moveCopyDialog}
        confirmDialog={confirmDialog}
        contextMenu={contextMenu}
        imageViewer={imageViewer}
        renameDialog={renameDialog}
        propertiesDialog={propertiesDialog}
        shareDialog={shareDialog}
        currentPath={currentPath}
        filteredItems={filteredItems}
        onMoveCopyClose={() =>
          setMoveCopyDialog({ open: false, mode: "move", items: [] })
        }
        onMoveCopyConfirm={handleMoveCopy}
        onConfirmDialogClose={() =>
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
        onConfirmDialogConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        }}
        onContextMenuClose={closeContextMenu}
        onContextMenuAction={handleContextMenuAction}
        onImageViewerClose={closeImageViewer}
        onImageViewerNavigate={navigateImageViewer}
        onRenameDialogClose={closeRenameDialog}
        onRenameConfirm={handleRename}
        onPropertiesDialogClose={closePropertiesDialog}
        onShareDialogClose={closeShareDialog}
        onCreateShare={handleCreateShare}
      />
    </div>
  );
}
