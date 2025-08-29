import { useState, useMemo } from "react";
import type { FileItem } from "./useFileData";

export function useFileFiltering() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "kind" | "size" | "date">("kind");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const filterAndSortItems = useMemo(() => {
    return (items: FileItem[]) => {
      return items
        .filter((item) => {
          if (!showHidden && item.name.startsWith(".")) return false;
          if (!searchQuery) return true;
          return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
          let comparison = 0;

          switch (sortBy) {
            case "name":
              comparison = a.name.localeCompare(b.name, undefined, {
                numeric: true,
              });
              break;
            case "kind":
              if (a.type !== b.type) {
                comparison = a.type === "dir" ? -1 : 1;
              } else {
                comparison = a.name.localeCompare(b.name, undefined, {
                  numeric: true,
                });
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
    };
  }, [sortBy, sortOrder, searchQuery, showHidden]);

  const handleSortChange = (by: string, order: string) => {
    setSortBy(by as "name" | "kind" | "size" | "date");
    setSortOrder(order as "asc" | "desc");
  };

  const toggleHidden = () => setShowHidden(!showHidden);

  return {
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    searchQuery,
    setSearchQuery,
    showHidden,
    setShowHidden,
    filterAndSortItems,
    handleSortChange,
    toggleHidden,
  };
}