"use client";
import React from "react";
import {
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

interface SelectionActionsProps {
  selectedCount: number;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

export default function SelectionActions({
  selectedCount,
  onMove,
  onCopy,
  onDelete,
  onDownload,
  onClearSelection,
  onSelectAll,
}: SelectionActionsProps) {
  if (selectedCount === 0) {
    return (
      <button
        onClick={onSelectAll}
        className="group text-slate-300 hover:text-blue-400 transition-all duration-200 p-1 sm:p-2 rounded-md hover:bg-blue-900/20"
        title="Select all items"
      >
        <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:text-blue-300 group-hover:scale-125 group-hover:rotate-12" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-700 rounded-md sm:rounded-lg p-1 sm:p-2 shadow-sm">
      <div className="flex items-center px-1.5 sm:px-3 py-0.5 sm:py-1 bg-slate-800/80 rounded text-blue-300 text-xs font-semibold">
        {selectedCount}
      </div>

      <button
        onClick={onMove}
        className="group text-slate-300 hover:text-blue-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-slate-700/50"
        title="Move selected items"
      >
        <ArrowsRightLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-180" />
      </button>

      <button
        onClick={onCopy}
        className="group text-slate-300 hover:text-emerald-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-slate-700/50"
        title="Copy selected items"
      >
        <DocumentDuplicateIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-110 group-hover:translate-x-1" />
      </button>

      <button
        onClick={onDownload}
        className="group text-slate-300 hover:text-purple-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-slate-700/50"
        title="Download selected items"
      >
        <ArrowDownTrayIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-110 group-hover:translate-y-1" />
      </button>

      <button
        onClick={onDelete}
        className="group text-slate-300 hover:text-red-400 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-slate-700/50"
        title="Delete selected items"
      >
        <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
      </button>

      <div className="w-px h-3 sm:h-6 bg-blue-700 mx-0.5 sm:mx-1"></div>

      <button
        onClick={onClearSelection}
        className="group text-slate-400 hover:text-slate-200 transition-all duration-200 p-1 sm:p-2 rounded hover:bg-slate-700/50"
        title="Clear selection"
      >
        <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-180" />
      </button>
    </div>
  );
}
