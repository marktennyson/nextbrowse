import { useState, useCallback } from "react";
import type { ItemDialogState, FileItem } from "./types";

export function useRenameDialog() {
  const [renameDialog, setRenameDialog] = useState<ItemDialogState>({
    open: false,
    item: null,
  });

  const openRenameDialog = useCallback((item: FileItem) => {
    setRenameDialog({ open: true, item });
  }, []);

  const closeRenameDialog = useCallback(() => {
    setRenameDialog({ open: false, item: null });
  }, []);

  return {
    renameDialog,
    setRenameDialog,
    openRenameDialog,
    closeRenameDialog,
  };
}

export function usePropertiesDialog() {
  const [propertiesDialog, setPropertiesDialog] = useState<ItemDialogState>({
    open: false,
    item: null,
  });

  const openPropertiesDialog = useCallback((item: FileItem) => {
    setPropertiesDialog({ open: true, item });
  }, []);

  const closePropertiesDialog = useCallback(() => {
    setPropertiesDialog({ open: false, item: null });
  }, []);

  return {
    propertiesDialog,
    setPropertiesDialog,
    openPropertiesDialog,
    closePropertiesDialog,
  };
}

export function useShareDialog() {
  const [shareDialog, setShareDialog] = useState<ItemDialogState>({
    open: false,
    item: null,
  });

  const openShareDialog = useCallback((item: FileItem) => {
    setShareDialog({ open: true, item });
  }, []);

  const closeShareDialog = useCallback(() => {
    setShareDialog({ open: false, item: null });
  }, []);

  return {
    shareDialog,
    setShareDialog,
    openShareDialog,
    closeShareDialog,
  };
}