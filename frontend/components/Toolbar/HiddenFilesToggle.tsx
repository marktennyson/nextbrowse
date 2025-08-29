"use client";
import React from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface HiddenFilesToggleProps {
  showHidden: boolean;
  onToggleHidden: () => void;
}

export default function HiddenFilesToggle({
  showHidden,
  onToggleHidden,
}: HiddenFilesToggleProps) {
  return (
    <button
      onClick={onToggleHidden}
      className={`group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border shadow-sm ${
        showHidden
          ? "text-amber-400 bg-amber-900/20 border-amber-700 hover:bg-amber-900/30"
          : "text-gray-400 bg-gray-800 border-gray-600 hover:text-gray-200 hover:bg-gray-700 hover:border-gray-500 hover:shadow-md"
      }`}
      title={showHidden ? "Hide hidden files" : "Show hidden files"}
    >
      {showHidden ? (
        <EyeSlashIcon className="h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 group-hover:text-amber-300 group-hover:scale-110 group-hover:rotate-12" />
      ) : (
        <EyeIcon className="h-3 w-3 text-gray-500 sm:h-4 sm:w-4 transition-all duration-300 group-hover:text-amber-400 group-hover:scale-110 group-hover:-rotate-12" />
      )}
      <span className="hidden md:hidden ml-2">
        {showHidden ? "Hide" : "Show"} Hidden
      </span>
    </button>
  );
}
