"use client";
import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";

interface SelectAllButtonProps {
  selectedCount: number;
  onSelectAll: () => void;
}

export default function SelectAllButton({
  selectedCount,
  onSelectAll,
}: SelectAllButtonProps) {
  if (selectedCount > 0) return null;

  return (
    <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onSelectAll}
        className="group inline-flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg"
      >
        <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 transition-transform duration-200 group-hover:scale-110" />
        Select all files
      </button>
    </div>
  );
}
