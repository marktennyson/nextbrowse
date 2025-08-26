"use client";

import React, { useState, useEffect, useCallback } from "react";
import FileList from "@/components/FileList";
import Toolbar from "@/components/Toolbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import UploadDropzone from "@/components/UploadDropzone";
import MoveCopyDialog from "@/components/MoveCopyDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ContextMenu from "@/components/ContextMenu";

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
  const [sortBy, setSortBy] = useState<"name" | "type" | "size" | "date">("name");
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

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
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
  const navigate = useCallback((path: string) => {
    const newPath = path.startsWith("/") ? path : `${currentPath}/${path}`.replace(/\/+/g, "/");
    setCurrentPath(newPath);
    setSelectedItems(new Set());
  }, [currentPath]);

  const navigateUp = useCallback(() => {
    const parts = currentPath.split("/").filter(Boolean);
    const newPath = parts.length > 0 ? "/" + parts.slice(0, -1).join("/") : "/";
    navigate(newPath);
  }, [currentPath, navigate]);

  // File selection
  const selectItem = useCallback((item: FileItem, selected: boolean) => {
    setSelectedItems(prev => {
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
    .filter(item => {
      if (!showHidden && item.name.startsWith(".")) return false;
      if (!searchQuery) return true;
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
          break;
        case "type":
          if (a.type !== b.type) {
            comparison = a.type === "dir" ? -1 : 1;
          } else {
            comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
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
    setSelectedItems(new Set(filteredItems.map(item => item.name)));
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

  const handleMoveCopy = useCallback(async (targetPath: string) => {
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
      setError(err instanceof Error ? err.message : `${mode} operation failed`);
    }
  }, [moveCopyDialog, currentPath, loadDirectory]);

  const createFolder = useCallback(async (folderName: string) => {
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
  }, [currentPath, loadDirectory]);

  // File upload
  const handleUpload = useCallback(async (files: FileList) => {
    const formData = new FormData();
    formData.append("path", currentPath);
    
    Array.from(files).forEach(file => {
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
  }, [currentPath, loadDirectory]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, item?: FileItem) => {
    e.preventDefault();
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      item,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ open: false, x: 0, y: 0 });
  }, []);

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse-slow text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={closeContextMenu}>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 py-3">
          <Breadcrumbs 
            path={currentPath} 
            onNavigate={navigate} 
          />
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
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
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 animate-slide-down">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
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
        onClose={() => setMoveCopyDialog({ open: false, mode: "move", items: [] })}
        onConfirm={handleMoveCopy}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onClose={() => setConfirmDialog({ open: false, title: "", message: "", onConfirm: () => {} })}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog({ open: false, title: "", message: "", onConfirm: () => {} });
        }}
      />

      <ContextMenu
        open={contextMenu.open}
        x={contextMenu.x}
        y={contextMenu.y}
        item={contextMenu.item}
        onClose={closeContextMenu}
        onAction={(action: string) => {
          closeContextMenu();
          // Handle context menu actions here
          console.log("Context menu action:", action, contextMenu.item);
        }}
      />
    </div>
  );
}