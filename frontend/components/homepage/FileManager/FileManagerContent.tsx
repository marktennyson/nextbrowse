"use client";

import React, { useCallback } from "react";
import FileList from "@/components/FileList";
import Toolbar from "@/components/Toolbar";
import UploadDropzone from "@/components/UploadDropzone";
import GlobalDropzone from "@/components/GlobalDropzone";
import Header from "../Header";
import ErrorMessage from "../ErrorMessage";
import EmptyState from "../EmptyState";
import DialogsContainer from "../DialogsContainer";
import { useFileOperations } from "../FileOperationsProvider";
import { FileValidator } from "@/lib/file-validator";
import { isAudioFile } from "@/lib/audio-utils";
import type { FileItem } from "./useFileData";

interface FileManagerContentProps {
  currentPath: string;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  filteredItems: FileItem[];
  selectedItems: Set<string>;
  highlightedItem: string | null;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  sortBy: "name" | "kind" | "size" | "date";
  sortOrder: "asc" | "desc";
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showHidden: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  audioFiles: FileItem[];
  selectedAudioFiles: FileItem[];
  onNavigate: (path: string) => void;
  onNavigateUp: () => void;
  onSelectItem: (item: FileItem, selected: boolean) => void;
  onHighlightItem: (item: FileItem | null) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSortChange: (by: string, order: string) => void;
  onToggleHidden: () => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  onCreateFolder: (name: string) => void;
  onMoveCopy: (targetPath: string, mode: "move" | "copy", items: string[]) => void;
  onRename: (item: FileItem, newName: string) => void;
  onDeleteItem: (item: FileItem) => void;
  onDownloadItem: (item: FileItem) => void;
  onPlayAllAudio: () => void;
  onPlaySelectedAudio: () => void;
  onAudioPlay: (item: FileItem) => void;
  onUploadComplete: () => void;
}

export default function FileManagerContent({
  currentPath,
  loading,
  error,
  setError,
  filteredItems,
  selectedItems,
  highlightedItem,
  viewMode,
  setViewMode,
  sortBy,
  sortOrder,
  searchQuery,
  setSearchQuery,
  showHidden,
  hasMore,
  loadingMore,
  audioFiles,
  selectedAudioFiles,
  onNavigate,
  onNavigateUp,
  onSelectItem,
  onHighlightItem,
  onSelectAll,
  onClearSelection,
  onSortChange,
  onToggleHidden,
  onLoadMore,
  onRefresh,
  onDeleteSelected,
  onDownloadSelected,
  onCreateFolder,
  onMoveCopy,
  onRename,
  onDeleteItem,
  onDownloadItem,
  onPlayAllAudio,
  onPlaySelectedAudio,
  onAudioPlay,
  onUploadComplete,
}: FileManagerContentProps) {
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

  const handleUpload = useCallback(async (files: FileList) => {
    const validation = FileValidator.validate(files, {
      maxFileSize: 100 * 1024 * 1024 * 1024,
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

    const evt = new CustomEvent<FileList>("fileUpload", { detail: files });
    document.dispatchEvent(evt);
  }, [setError]);

  const handleFileEdit = useCallback(
    (item: FileItem) => {
      const filePath = `${currentPath}/${item.name}`.replace(/\/+/g, "/");
      const encodedPath = encodeURIComponent(filePath);
      window.open(`/ide?file=${encodedPath}`, "_blank");
    },
    [currentPath]
  );

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
              onAudioPlay(item);
            }
            break;

          case "open":
            if (item.type === "dir") {
              onNavigate(item.name);
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
            onDownloadItem(item);
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
                onDeleteItem(item);
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
      onNavigate,
      onAudioPlay,
      onDownloadItem,
      onDeleteItem,
      setMoveCopyDialog,
      openRenameDialog,
      setConfirmDialog,
      openPropertiesDialog,
      openShareDialog,
      closeContextMenu,
      setError,
    ]
  );

  const handleMoveCopyConfirm = useCallback(
    async (targetPath: string) => {
      const { mode, items } = moveCopyDialog;
      await onMoveCopy(targetPath, mode, items);
      setMoveCopyDialog({ open: false, mode: "move", items: [] });
    },
    [moveCopyDialog, onMoveCopy, setMoveCopyDialog]
  );

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
    [setError]
  );

  return (
    <div className="min-h-screen relative" onClick={closeContextMenu}>
      <Header
        currentPath={currentPath}
        filteredItemsCount={filteredItems.length}
        selectedItemsCount={selectedItems.size}
        searchQuery={searchQuery}
        onNavigate={onNavigate}
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
          onSortChange={onSortChange}
          onToggleHidden={onToggleHidden}
          onSelectAll={onSelectAll}
          onClearSelection={onClearSelection}
          onDelete={() => {
            if (selectedItems.size > 0) {
              setConfirmDialog({
                open: true,
                title: "Delete Items",
                message: `Are you sure you want to delete ${selectedItems.size} item(s)?`,
                onConfirm: onDeleteSelected,
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
              onDownloadSelected();
            }
          }}
          onCreateFolder={onCreateFolder}
          onUpload={handleUpload}
          onRefresh={onRefresh}
          onNavigateUp={onNavigateUp}
          onPlayAllAudio={onPlayAllAudio}
          onPlaySelectedAudio={onPlaySelectedAudio}
          canNavigateUp={currentPath !== "/"}
        />

        {error && <ErrorMessage error={error} onClose={() => setError(null)} />}

        <UploadDropzone onUploadComplete={onUploadComplete} targetPath={currentPath}>
          <GlobalDropzone onFilesDropped={handleUpload} enabled={!loading} />
          <FileList
            items={filteredItems}
            selectedItems={selectedItems}
            highlightedItem={highlightedItem}
            viewMode={viewMode}
            onNavigate={onNavigate}
            onSelect={onSelectItem}
            onHighlight={onHighlightItem}
            onContextMenu={handleContextMenu}
            onImageClick={(item) => openImageViewer(item, filteredItems)}
            onFileEdit={handleFileEdit}
            onAudioPlay={onAudioPlay}
            loading={loading}
            hasMore={hasMore && !searchQuery}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
          />
        </UploadDropzone>

        {filteredItems.length === 0 && !loading && (
          <EmptyState searchQuery={searchQuery} onFilesSelected={handleUpload} />
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
        onMoveCopyConfirm={handleMoveCopyConfirm}
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
        onRenameConfirm={async (newName) => {
          if (renameDialog.item) {
            await onRename(renameDialog.item, newName);
            closeRenameDialog();
          }
        }}
        onPropertiesDialogClose={closePropertiesDialog}
        onShareDialogClose={closeShareDialog}
        onCreateShare={handleCreateShare}
      />
    </div>
  );
}