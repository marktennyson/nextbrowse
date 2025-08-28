"use client";

import React, { createContext, useContext } from "react";
import { useMoveCopyDialog } from "./useMoveCopyDialog";
import { useConfirmDialog } from "./useConfirmDialog";
import { useContextMenu } from "./useContextMenu";
import { useImageViewer } from "./useImageViewer";
import { useRenameDialog, usePropertiesDialog, useShareDialog } from "./useItemDialogs";
import type { FileOperationsContextType } from "./types";

// Re-export types for external use
export type { FileItem } from "./types";

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
  const { moveCopyDialog, setMoveCopyDialog } = useMoveCopyDialog();
  const { confirmDialog, setConfirmDialog } = useConfirmDialog();
  const { 
    contextMenu, 
    setContextMenu, 
    handleContextMenu, 
    closeContextMenu 
  } = useContextMenu();
  const {
    imageViewer,
    setImageViewer,
    openImageViewer,
    closeImageViewer,
    navigateImageViewer,
  } = useImageViewer();
  const {
    renameDialog,
    setRenameDialog,
    openRenameDialog,
    closeRenameDialog,
  } = useRenameDialog();
  const {
    propertiesDialog,
    setPropertiesDialog,
    openPropertiesDialog,
    closePropertiesDialog,
  } = usePropertiesDialog();
  const {
    shareDialog,
    setShareDialog,
    openShareDialog,
    closeShareDialog,
  } = useShareDialog();

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