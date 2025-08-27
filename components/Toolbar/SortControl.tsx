"use client";
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  AdjustmentsHorizontalIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

type SortBy = "name" | "type" | "size" | "date";
type SortOrder = "asc" | "desc";

interface SortControlProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (by: SortBy, order: SortOrder) => void;
}

export default function SortControl({
  sortBy,
  sortOrder,
  onSortChange,
}: SortControlProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Reposition the menu whenever it opens or the window resizes/scrolls
  useLayoutEffect(() => {
    if (!showSortMenu || !triggerRef.current) return;

    const recalc = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const menuWidth = 192; // w-48 = 12rem = 192px
      const gap = 8; // mt-2 ~ 0.5rem
      const left = Math.max(8, rect.left + rect.width - menuWidth); // right-align with some padding
      const top = rect.bottom + gap;
      setMenuPos({ top, left });
    };

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [showSortMenu]);

  // Click outside to close
  useEffect(() => {
    if (!showSortMenu) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const tgt = e.target as Node;
      const menuEl = document.getElementById("sort-menu-portal");
      if (
        containerRef.current &&
        !containerRef.current.contains(tgt) &&
        menuEl &&
        !menuEl.contains(tgt)
      ) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [showSortMenu]);

  const sortOptions: SortBy[] = ["name", "type", "size", "date"];

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setShowSortMenu((s) => !s)}
        className="group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm hover:shadow-md"
        aria-haspopup="menu"
        aria-expanded={showSortMenu}
        aria-controls="sort-menu-portal"
      >
        <AdjustmentsHorizontalIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 transition-transform duration-200 group-hover:scale-110" />
        <span className="hidden sm:inline capitalize mr-1">{sortBy}</span>
        <ChevronUpDownIcon className="h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-0 transition-transform duration-200 group-hover:rotate-180" />
      </button>

      {showSortMenu &&
        menuPos &&
        createPortal(
          <div
            id="sort-menu-portal"
            role="menu"
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
            className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl backdrop-blur-xl z-[9999]"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                Sort by
              </div>
              {sortOptions.map((option) => {
                const isActive = sortBy === option;
                const nextOrder: SortOrder =
                  isActive && sortOrder === "asc" ? "desc" : "asc";
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onSortChange(option, nextOrder);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-1 flex items-center justify-between ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    role="menuitemradio"
                    aria-checked={isActive}
                  >
                    <span className="capitalize font-medium">{option}</span>
                    {isActive && (
                      <span
                        className={`text-sm transition-transform duration-200 ${
                          sortOrder === "desc" ? "rotate-180" : ""
                        }`}
                      >
                        ↑
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
