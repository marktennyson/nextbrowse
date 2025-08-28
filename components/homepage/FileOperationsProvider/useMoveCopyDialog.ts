import { useState } from "react";
import type { MoveCopyDialogState } from "./types";

export function useMoveCopyDialog() {
  const [moveCopyDialog, setMoveCopyDialog] = useState<MoveCopyDialogState>({
    open: false,
    mode: "move",
    items: [],
  });

  return {
    moveCopyDialog,
    setMoveCopyDialog,
  };
}