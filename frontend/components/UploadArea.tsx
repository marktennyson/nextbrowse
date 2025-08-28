"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CloudArrowUpIcon,
  DocumentPlusIcon,
  FolderPlusIcon,
} from "@heroicons/react/24/outline";

interface UploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  className?: string;
  showBorder?: boolean;
}

export default function UploadArea({
  onFilesSelected,
  className = "",
  showBorder = true,
}: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderInputClick = () => {
    folderInputRef.current?.click();
  };

  // Ensure folder input supports directory selection across browsers
  useEffect(() => {
    if (folderInputRef.current) {
      try {
        folderInputRef.current.setAttribute("webkitdirectory", "");
        folderInputRef.current.setAttribute("directory", "");
      } catch {}
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  const borderStyles = showBorder
    ? "border-2 border-dashed border-gray-300 dark:border-gray-600"
    : "";

  const dragOverStyles = isDragOver
    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
    : "hover:border-gray-400 dark:hover:border-gray-500";

  return (
    <div
      className={`relative ${borderStyles} ${dragOverStyles} rounded-xl p-8 transition-all duration-200 ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        aria-label="Select files to upload"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        aria-label="Select folder to upload"
      />

      <div className="text-center">
        <div className="mb-6">
          <CloudArrowUpIcon
            className={`h-16 w-16 mx-auto transition-colors ${
              isDragOver ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
            }`}
          />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isDragOver ? "Drop files to upload" : "Upload your files"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Drag & drop files anywhere or click to browse
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            onClick={handleFileInputClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <DocumentPlusIcon className="h-5 w-5 mr-2" />
            Choose Files
          </button>

          <button
            onClick={handleFolderInputClick}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <FolderPlusIcon className="h-5 w-5 mr-2" />
            Choose Folder
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Supports all file types • Resumable uploads • Folder preservation
          </div>
          <div className="mt-1">
            Maximum 100GB per file • 5000 files per batch
          </div>
        </div>
      </div>
    </div>
  );
}
