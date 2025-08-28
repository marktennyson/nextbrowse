import { useState, useCallback } from "react";
import type { FileItem } from "./useFileData";

export function useFileSelection() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);

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

  const highlightItem = useCallback((item: FileItem | null) => {
    setHighlightedItem(item?.name || null);
  }, []);

  const selectAll = useCallback((items: FileItem[]) => {
    setSelectedItems(new Set(items.map((item) => item.name)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setHighlightedItem(null);
  }, []);

  return {
    selectedItems,
    highlightedItem,
    selectItem,
    highlightItem,
    selectAll,
    clearSelection,
    setSelectedItems,
    setHighlightedItem,
  };
}