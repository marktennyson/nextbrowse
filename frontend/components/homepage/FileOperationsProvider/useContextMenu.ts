import { useState, useCallback } from "react";
import type { ContextMenuState, FileItem } from "./types";

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
  });

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

  return {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    closeContextMenu,
  };
}