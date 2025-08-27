"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface FileOperationsContextType {
  // Dialog states
  moveCopyDialog: {
    open: boolean;
    mode: "move" | "copy";
    items: string[];
  };
  confirmDialog: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    item?: FileItem;
  };
  imageViewer: {
    open: boolean;
    currentIndex: number;
  };
  renameDialog: {
    open: boolean;
    item: FileItem | null;
  };
  propertiesDialog: {
    open: boolean;
    item: FileItem | null;
  };
  shareDialog: {
    open: boolean;
    item: FileItem | null;
  };

  // Dialog handlers
  setMoveCopyDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      mode: "move" | "copy";
      items: string[];
    }>
  >;
  setConfirmDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
    }>
  >;
  setContextMenu: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      x: number;
      y: number;
      item?: FileItem;
    }>
  >;
  setImageViewer: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      currentIndex: number;
    }>
  >;
  setRenameDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      item: FileItem | null;
    }>
  >;
  setPropertiesDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      item: FileItem | null;
    }>
  >;
  setShareDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      item: FileItem | null;
    }>
  >;

  // Utility handlers
  handleContextMenu: (e: React.MouseEvent, item?: FileItem) => void;
  closeContextMenu: () => void;
  openImageViewer: (item: FileItem, filteredItems: FileItem[]) => void;
  closeImageViewer: () => void;
  navigateImageViewer: (index: number) => void;
  openRenameDialog: (item: FileItem) => void;
  closeRenameDialog: () => void;
  openPropertiesDialog: (item: FileItem) => void;
  closePropertiesDialog: () => void;
  openShareDialog: (item: FileItem) => void;
  closeShareDialog: () => void;
}

const FileOperationsContext = createContext<FileOperationsContextType | undefined>(undefined);

export function useFileOperations() {
  const context = useContext(FileOperationsContext);
  if (!context) {
    throw new Error("useFileOperations must be used within a FileOperationsProvider");
  }
  return context;
}

interface FileOperationsProviderProps {
  children: React.ReactNode;
}

export default function FileOperationsProvider({ children }: FileOperationsProviderProps) {
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

  const [shareDialog, setShareDialog] = useState<{
    open: boolean;
    item: FileItem | null;
  }>({ open: false, item: null });

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
    (item: FileItem, filteredItems: FileItem[]) => {
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
    []
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

  // Properties dialog handlers
  const openPropertiesDialog = useCallback((item: FileItem) => {
    setPropertiesDialog({ open: true, item });
  }, []);

  const closePropertiesDialog = useCallback(() => {
    setPropertiesDialog({ open: false, item: null });
  }, []);

  // Share dialog handlers
  const openShareDialog = useCallback((item: FileItem) => {
    setShareDialog({ open: true, item });
  }, []);

  const closeShareDialog = useCallback(() => {
    setShareDialog({ open: false, item: null });
  }, []);

  const value: FileOperationsContextType = {
    // Dialog states
    moveCopyDialog,
    confirmDialog,
    contextMenu,
    imageViewer,
    renameDialog,
    propertiesDialog,
    shareDialog,

    // Dialog setters
    setMoveCopyDialog,
    setConfirmDialog,
    setContextMenu,
    setImageViewer,
    setRenameDialog,
    setPropertiesDialog,
    setShareDialog,

    // Utility handlers
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
  };

  return (
    <FileOperationsContext.Provider value={value}>
      {children}
    </FileOperationsContext.Provider>
  );
}