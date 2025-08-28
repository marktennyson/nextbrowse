"use client";
import React from "react";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface NavigationButtonsProps {
  canNavigateUp: boolean;
  onNavigateUp: () => void;
  onRefresh: () => void;
}

export default function NavigationButtons({
  canNavigateUp,
  onNavigateUp,
  onRefresh,
}: NavigationButtonsProps) {
  return (
    <>
      {/* Back Button */}
      <button
        onClick={onNavigateUp}
        disabled={!canNavigateUp}
        className={`group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
          canNavigateUp
            ? "text-gray-200 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:border-gray-500 hover:shadow-md"
            : "text-gray-500 bg-gray-800/50 border border-gray-700 cursor-not-allowed"
        }`}
        title="Navigate to parent directory"
      >
        <ArrowLeftIcon
          className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 transition-transform duration-200 ${
            canNavigateUp ? "group-hover:-translate-x-0.5" : ""
          }`}
        />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        className="group inline-flex items-center px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 text-gray-200 bg-gray-800 border border-gray-600 hover:bg-gray-700 hover:border-gray-500 shadow-sm hover:shadow-md"
        title="Refresh"
      >
        <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 transition-transform duration-200 group-hover:rotate-180" />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </>
  );
}
