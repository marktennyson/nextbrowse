"use client";

import { formatFileSize } from "@/lib/file-utils";

interface StatusBarProps {
  currentFile?: string;
  fileSize?: number;
  cursorPosition?: { line: number; column: number };
  language?: string;
  isDirty?: boolean;
  isLoading?: boolean;
}

export default function StatusBar({
  currentFile,
  fileSize,
  cursorPosition,
  language,
  isDirty,
  isLoading,
}: StatusBarProps) {
  return (
    <div className="h-6 bg-blue-600 dark:bg-blue-800 text-white text-xs flex items-center justify-between px-3">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
          )}
          {currentFile && (
            <span className="truncate max-w-[200px]">
              {currentFile.split("/").pop()}
            </span>
          )}
          {isDirty && <span className="text-yellow-300">●</span>}
        </div>
        
        {fileSize !== undefined && (
          <span>{formatFileSize(fileSize)}</span>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {cursorPosition && (
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
        
        {language && language !== "plaintext" && (
          <span className="capitalize">{language}</span>
        )}
        
        <span>UTF-8</span>
      </div>
    </div>
  );
}