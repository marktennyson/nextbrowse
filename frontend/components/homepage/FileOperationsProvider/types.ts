import React from "react";

export interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

export interface MoveCopyDialogState {
  open: boolean;
  mode: "move" | "copy";
  items: string[];
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  item?: FileItem;
}

export interface ImageViewerState {
  open: boolean;
  currentIndex: number;
}

export interface ItemDialogState {
  open: boolean;
  item: FileItem | null;
}

export interface FileOperationsContextType {
  // Dialog states
  moveCopyDialog: MoveCopyDialogState;
  confirmDialog: ConfirmDialogState;
  contextMenu: ContextMenuState;
  imageViewer: ImageViewerState;
  renameDialog: ItemDialogState;
  propertiesDialog: ItemDialogState;
  shareDialog: ItemDialogState;

  // Dialog handlers
  setMoveCopyDialog: React.Dispatch<React.SetStateAction<MoveCopyDialogState>>;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState>>;
  setImageViewer: React.Dispatch<React.SetStateAction<ImageViewerState>>;
  setRenameDialog: React.Dispatch<React.SetStateAction<ItemDialogState>>;
  setPropertiesDialog: React.Dispatch<React.SetStateAction<ItemDialogState>>;
  setShareDialog: React.Dispatch<React.SetStateAction<ItemDialogState>>;

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