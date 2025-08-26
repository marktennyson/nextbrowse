"use client";
import React, { useState } from "react";
import {
  ArrowUpIcon,
  ArrowLeftIcon,
  FolderPlusIcon,
  TrashIcon,
  DocumentArrowUpIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronUpDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface ToolbarProps {
  selectedCount: number;
  viewMode: "grid" | "list";
  sortBy: "name" | "type" | "size" | "date";
  sortOrder: "asc" | "desc";
  searchQuery: string;
  showHidden: boolean;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortChange: (by: "name" | "type" | "size" | "date", order: "asc" | "desc") => void;
  onSearchChange: (query: string) => void;
  onToggleHidden: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onCreateFolder: (name: string) => void;
  onRefresh: () => void;
  onNavigateUp: () => void;
  canNavigateUp: boolean;
}

export default function Toolbar({
  selectedCount,
  viewMode,
  sortBy,
  sortOrder,
  searchQuery,
  showHidden,
  onViewModeChange,
  onSortChange,
  onSearchChange,
  onToggleHidden,
  onSelectAll,
  onClearSelection,
  onDelete,
  onMove,
  onCopy,
  onCreateFolder,
  onRefresh,
  onNavigateUp,
  canNavigateUp,
}: ToolbarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-soft mb-6">
      <div className="p-4">
        {/* Main toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left side - Navigation & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateUp}
              disabled={!canNavigateUp}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                canNavigateUp
                  ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
              }`}
              title="Go back one directory level"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>

            <button
              onClick={onNavigateUp}
              disabled={!canNavigateUp}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                canNavigateUp
                  ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
              }`}
              title="Go up one level"
            >
              <ArrowUpIcon className="h-4 w-4 mr-1" />
              Up
            </button>

            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Refresh
            </button>

            <div className="h-6 border-l border-gray-300" />

            {/* New Folder */}
            <div className="relative">
                {showNewFolder ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                        if (e.key === 'Escape') {
                          setShowNewFolder(false);
                          setNewFolderName("");
                        }
                      }}
                      placeholder="Folder name"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFolder(false);
                        setNewFolderName("");
                      }}
                      className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewFolder(true)}
                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <FolderPlusIcon className="h-4 w-4 mr-1" />
                    New Folder
                  </button>
                )}
              </div>

            <input
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  // This would trigger upload through the parent's upload handler
                  const event = new CustomEvent('fileUpload', { detail: e.target.files });
                  document.dispatchEvent(event);
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
              Upload
            </label>
          </div>

          {/* Right side - Search & View Options */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search files..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => onViewModeChange("grid")}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid view"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`p-2 rounded text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Sort Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ChevronUpDownIcon className="h-4 w-4 mr-1" />
                Sort
              </button>
              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                  <div className="py-1">
                    {(["name", "type", "size", "date"] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          const newOrder = sortBy === option && sortOrder === "asc" ? "desc" : "asc";
                          onSortChange(option, newOrder);
                          setShowSortMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span className="capitalize">{option}</span>
                        {sortBy === option && (
                          <span className="text-xs text-gray-500">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hidden Files Toggle */}
            <button
              onClick={onToggleHidden}
              className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showHidden
                  ? 'text-blue-700 bg-blue-50 border border-blue-200'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
              title="Toggle hidden files"
            >
              {showHidden ? (
                <EyeIcon className="h-4 w-4" />
              ) : (
                <EyeSlashIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Selection Actions */}
        {selectedCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={onClearSelection}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={onCopy}
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                  Copy
                </button>
                <button
                  onClick={onMove}
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Move
                </button>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 border border-transparent hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
