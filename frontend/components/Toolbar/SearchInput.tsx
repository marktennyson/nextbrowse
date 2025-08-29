"use client";
import React from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface SearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchInput({
  searchQuery,
  onSearchChange,
}: SearchInputProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group-focus-within:scale-110" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search files..."
        className="w-32 sm:w-48 md:w-56 lg:w-64 pl-7 sm:pl-10 pr-8 sm:pr-10 py-1.5 sm:py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md sm:rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 sm:focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:outline-none transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) shadow-sm hover:shadow-md focus:shadow-lg"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange("")}
          className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) hover:scale-110 active:scale-95"
        >
          <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}
