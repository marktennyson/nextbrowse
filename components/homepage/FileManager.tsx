"use client";

import React, { useState, useEffect, useCallback } from "react";
import FileList from "@/components/FileList";
import Toolbar from "@/components/Toolbar";
import UploadDropzone from "@/components/UploadDropzone";
import Header from "./Header";
import ErrorMessage from "./ErrorMessage";
import EmptyState from "./EmptyState";
import LoadingSpinner from "./LoadingSpinner";
import DialogsContainer from "./DialogsContainer";
import { useFileOperations } from "./FileOperationsProvider";

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

export default function FileManager() {
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

  const {
    moveCopyDialog,
    confirmDialog,
    contextMenu,
    imageViewer,
    renameDialog,
    propertiesDialog,
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
  } = useFileOperations();

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
            if (item.url) {
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
      closeContextMenu,
    ]
  ); // Show loading spinner if initial load
  if (loading && items.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen relative" onClick={closeContextMenu}>
      <Header
        currentPath={currentPath}
        filteredItemsCount={filteredItems.length}
        selectedItemsCount={selectedItems.size}
        onNavigate={navigate}
      />

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

        {error && <ErrorMessage error={error} onClose={() => setError(null)} />}

        <UploadDropzone onUpload={handleUpload}>
          <FileList
            items={filteredItems}
            selectedItems={selectedItems}
            viewMode={viewMode}
            onNavigate={navigate}
            onSelect={selectItem}
            onContextMenu={handleContextMenu}
            onImageClick={(item) => openImageViewer(item, filteredItems)}
            onFileEdit={handleFileEdit}
            loading={loading}
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
      />
    </div>
  );
}
