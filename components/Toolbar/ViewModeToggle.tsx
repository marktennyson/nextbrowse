"use client";
import React from "react";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";

interface ViewModeToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: ViewModeToggleProps) {
  return (
    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md sm:rounded-lg p-0.5 sm:p-1 shadow-sm">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`group inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-2 rounded text-sm transition-all duration-200 ${
          viewMode === "grid"
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }`}
        title="Grid view"
      >
        <Squares2X2Icon
          className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${
            viewMode === "grid" ? "scale-110" : "group-hover:scale-105"
          }`}
        />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`group inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-2 rounded text-sm transition-all duration-200 ${
          viewMode === "list"
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
        }`}
        title="List view"
      >
        <ListBulletIcon
          className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${
            viewMode === "list" ? "scale-110" : "group-hover:scale-105"
          }`}
        />
      </button>
    </div>
  );
}
