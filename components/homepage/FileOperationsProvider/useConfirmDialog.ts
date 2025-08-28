import { useState } from "react";
import type { ConfirmDialogState } from "./types";

export function useConfirmDialog() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  return {
    confirmDialog,
    setConfirmDialog,
  };
}