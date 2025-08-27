"use client";
import React from "react";
import {
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface SelectionActionsProps {
  selectedCount: number;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

export default function SelectionActions({
  selectedCount,
  onMove,
  onCopy,
  onDelete,
  onClearSelection,
  onSelectAll,
}: SelectionActionsProps) {
  if (selectedCount === 0) {
    return (
      <button
        onClick={onSelectAll}
        className="group text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 p-1 sm:p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
        title="Select all items"
      >
        <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-md sm:rounded-lg p-1 sm:p-2 shadow-sm">
      <div className="flex items-center px-1.5 sm:px-3 py-0.5 sm:py-1 bg-white/80 dark:bg-gray-800/80 rounded text-blue-700 dark:text-blue-300 text-xs font-semibold">
        {selectedCount}
      </div>

      <button
        onClick={onMove}
        className="group text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50"
        title="Move selected items"
      >
        <ArrowsRightLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>

      <button
        onClick={onCopy}
        className="group text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50"
        title="Copy selected items"
      >
        <DocumentDuplicateIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>

      <button
        onClick={onDelete}
        className="group text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50"
        title="Delete selected items"
      >
        <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
      </button>

      <div className="w-px h-3 sm:h-6 bg-blue-200 dark:bg-blue-700 mx-0.5 sm:mx-1"></div>

      <button
        onClick={onClearSelection}
        className="group text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-white/50 dark:hover:bg-gray-700/50"
        title="Clear selection"
      >
        <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:rotate-90" />
      </button>
    </div>
  );
}
