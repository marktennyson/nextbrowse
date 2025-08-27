"use client";

import React, { useState, useEffect, useCallback } from "react";
import FileList from "@/components/FileList";
import Toolbar from "@/components/Toolbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import UploadDropzone from "@/components/UploadDropzone";
import MoveCopyDialog from "@/components/MoveCopyDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ContextMenu from "@/components/ContextMenu";
import ThemeToggle from "@/components/ThemeToggle";
import ImageViewer from "@/components/ImageViewer";
import RenameDialog from "@/components/RenameDialog";
import PropertiesDialog from "@/components/PropertiesDialog";

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
}

export default function HomePage() {
  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "type" | "size" | "date">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  // Dialog states
  const [moveCopyDialog, setMoveCopyDialog] = useState<{
    open: boolean;
    mode: "move" | "copy";
    items: string[];
  }>({ open: false, mode: "move", items: [] });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    item?: FileItem;
  }>({ open: false, x: 0, y: 0 });

  const [imageViewer, setImageViewer] = useState<{
    open: boolean;
    currentIndex: number;
  }>({ open: false, currentIndex: 0 });

  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });

  const [propertiesDialog, setPropertiesDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/fs/list?path=${encodeURIComponent(path)}`
      );
      const data: DirectoryData = await response.json();

      if (data.ok) {
        setItems(data.items);
        setCurrentPath(data.path);
      } else {
        setError(data.error || "Failed to load directory");
      }
    } catch {
      setError("Network error while loading directory");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadDirectory(currentPath);
  }, [loadDirectory, currentPath]);

  // Navigation
  const navigate = useCallback(
    (path: string) => {
      const newPath = path.startsWith("/")
        ? path
        : `${currentPath}/${path}`.replace(/\/+/g, "/");
      setCurrentPath(newPath);
      setSelectedItems(new Set());
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

  // Filtering and sorting
  const filteredItems = items
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
        case "type":
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

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map((item) => item.name)));
  }, [filteredItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

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
          const error = await response.json();
          throw new Error(error.error || "Delete failed");
        }
      }

      await loadDirectory(currentPath);
      setSelectedItems(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete operation failed");
    }
  }, [selectedItems, currentPath, loadDirectory]);

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
            const error = await response.json();
            throw new Error(error.error || `${mode} failed`);
          }
        }

        await loadDirectory(currentPath);
        setSelectedItems(new Set());
        setMoveCopyDialog({ open: false, mode: "move", items: [] });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `${mode} operation failed`
        );
      }
    },
    [moveCopyDialog, currentPath, loadDirectory]
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
          const error = await response.json();
          throw new Error(error.error || "Create folder failed");
        }

        await loadDirectory(currentPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Create folder failed");
      }
    },
    [currentPath, loadDirectory]
  );

  // File upload
  const handleUpload = useCallback(
    async (files: FileList) => {
      const formData = new FormData();
      formData.append("path", currentPath);

      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      try {
        const response = await fetch("/api/fs/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        await loadDirectory(currentPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [currentPath, loadDirectory]
  );

  // Context menu handlers
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item?: FileItem) => {
      e.preventDefault();
      setContextMenu({
        open: true,
        x: e.clientX,
        y: e.clientY,
        item,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0 });
  }, []);

  // Image viewer handlers
  const openImageViewer = useCallback(
    (item: FileItem) => {
      // Find all image files in current directory
      const imageItems = filteredItems.filter((file) => {
        if (file.type !== "file" || !file.url) return false;
        const ext = file.name.split(".").pop()?.toLowerCase();
        return [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "webp",
          "bmp",
          "tiff",
          "svg",
        ].includes(ext || "");
      });

      const currentIndex = imageItems.findIndex(
        (img) => img.name === item.name
      );
      if (currentIndex >= 0) {
        setImageViewer({ open: true, currentIndex });
      }
    },
    [filteredItems]
  );

  const closeImageViewer = useCallback(() => {
    setImageViewer({ open: false, currentIndex: 0 });
  }, []);

  const navigateImageViewer = useCallback((index: number) => {
    setImageViewer((prev) => ({ ...prev, currentIndex: index }));
  }, []);

  // Rename dialog handlers
  const openRenameDialog = useCallback((item: FileItem) => {
    setRenameDialog({ open: true, item });
  }, []);

  const closeRenameDialog = useCallback(() => {
    setRenameDialog({ open: false, item: null });
  }, []);

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
          const error = await response.json();
          setError(error.error || "Rename failed");
        } else {
          await loadDirectory(currentPath);
          closeRenameDialog();
        }
      } catch {
        setError("Failed to rename item");
      }
    },
    [renameDialog.item, currentPath, loadDirectory, closeRenameDialog]
  );

  // Properties dialog handlers
  const openPropertiesDialog = useCallback((item: FileItem) => {
    setPropertiesDialog({ open: true, item });
  }, []);

  const closePropertiesDialog = useCallback(() => {
    setPropertiesDialog({ open: false, item: null });
  }, []);

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-4 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-20 h-20 mx-auto border-4 border-purple-500/20 border-b-purple-500 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>
          <div className="text-cyan-300 font-medium animate-pulse">
            Initializing Neural Network...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" onClick={closeContextMenu}>
      {/* Compact Header */}
      <div className="glass border-b border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-2 min-h-[2.5rem]">
          {/* Left: Brand + Breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-blue-100 dark:bg-white/10 rounded-md flex items-center justify-center shrink-0">
              <span className="text-blue-600 dark:text-white font-bold text-sm">
                NB
              </span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-slate-300 dark:bg-white/20 mx-1"></div>
            <div className="min-w-0 flex-1">
              <Breadcrumbs path={currentPath} onNavigate={navigate} />
            </div>
          </div>

          {/* Center: Stats (on larger screens) */}
          <div className="hidden md:flex items-center text-xs text-slate-500 dark:text-gray-400 gap-1.5 px-2">
            <span>{filteredItems.length}</span>
            <span>•</span>
            <span>{selectedItems.size} selected</span>
          </div>

          {/* Right: Theme Toggle */}
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-3 sm:px-4 py-3">
        <Toolbar
          selectedCount={selectedItems.size}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          showHidden={showHidden}
          onViewModeChange={setViewMode}
          onSortChange={(by: string, order: string) => {
            setSortBy(by as "name" | "type" | "size" | "date");
            setSortOrder(order as "asc" | "desc");
          }}
          onSearchChange={setSearchQuery}
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
          onCreateFolder={(name: string) => createFolder(name)}
          onRefresh={() => loadDirectory(currentPath)}
          onNavigateUp={navigateUp}
          canNavigateUp={currentPath !== "/"}
        />

        {error && (
          <div className="mb-6 p-4 glass-dark border border-red-500/30 rounded-xl text-red-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                {error}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 ml-4 text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <UploadDropzone onUpload={handleUpload}>
          <FileList
            items={filteredItems}
            selectedItems={selectedItems}
            viewMode={viewMode}
            onNavigate={navigate}
            onSelect={selectItem}
            onContextMenu={handleContextMenu}
            onImageClick={openImageViewer}
            loading={loading}
          />
        </UploadDropzone>

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No files found</div>
            {searchQuery && (
              <div className="text-gray-500 text-sm">
                Try adjusting your search query or upload some files
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <MoveCopyDialog
        open={moveCopyDialog.open}
        mode={moveCopyDialog.mode}
        currentPath={currentPath}
        onClose={() =>
          setMoveCopyDialog({ open: false, mode: "move", items: [] })
        }
        onConfirm={handleMoveCopy}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() =>
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog({
            open: false,
            title: "",
            message: "",
            onConfirm: () => {},
          });
        }}
      />

      <ContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        item={contextMenu.item}
        onClose={closeContextMenu}
        onAction={async (action: string) => {
          const item = contextMenu.item;
          closeContextMenu();
          if (!item) return;
          const itemPath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");

          try {
            switch (action) {
              case "open":
                if (item.type === "dir") {
                  navigate(item.name);
                } else if (item.url) {
                  window.open(item.url, "_blank");
                }
                break;

              case "download":
                if (item.url) {
                  // Create a temporary link to download the file
                  const link = document.createElement("a");
                  link.href = item.url;
                  link.download = item.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
                break;

              case "copy":
                setMoveCopyDialog({
                  open: true,
                  mode: "copy",
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
                        const error = await response.json();
                        setError(error.error || "Delete failed");
                      } else {
                        await loadDirectory(currentPath);
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

              default:
                break;
            }
          } catch {
            setError(`Failed to perform ${action} operation`);
          }
        }}
      />

      <ImageViewer
        open={imageViewer.open}
        items={filteredItems}
        currentIndex={imageViewer.currentIndex}
        onClose={closeImageViewer}
        onNavigate={navigateImageViewer}
      />

      <RenameDialog
        open={renameDialog.open}
        itemName={renameDialog.item?.name || ""}
        itemType={renameDialog.item?.type || "file"}
        onClose={closeRenameDialog}
        onConfirm={handleRename}
      />

      <PropertiesDialog
        open={propertiesDialog.open}
        item={propertiesDialog.item}
        path={currentPath}
        onClose={closePropertiesDialog}
      />
    </div>
  );
}
