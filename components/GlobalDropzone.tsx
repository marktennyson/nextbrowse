"use client";
import React, { useState, useRef, useEffect } from "react";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface GlobalDropzoneProps {
  onFilesDropped: (files: FileList) => void;
  enabled: boolean;
}

export default function GlobalDropzone({ onFilesDropped, enabled }: GlobalDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        // Check if any of the items are files
        const hasFiles = Array.from(e.dataTransfer.items).some(
          item => item.kind === 'file'
        );
        if (hasFiles) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Set the drop effect to copy to show the correct cursor
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    };

    // Attach to document for global coverage
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [enabled, onFilesDropped]);

  if (!enabled || !isDragging) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Drop indicator */}
      <div className="absolute inset-4 border-4 border-dashed border-blue-400 rounded-2xl bg-blue-50/90 dark:bg-blue-900/90 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <CloudArrowUpIcon className="h-24 w-24 text-blue-500 dark:text-blue-400 mx-auto animate-bounce" />
            {/* Upload animation rings */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-300 dark:border-blue-600 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-blue-400 dark:border-blue-500 animate-ping animation-delay-100" />
          </div>
          
          <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4">
            Drop Files Anywhere
          </h2>
          
          <p className="text-lg text-blue-600 dark:text-blue-200 mb-2">
            Release to start uploading
          </p>
          
          <p className="text-sm text-blue-500 dark:text-blue-300 opacity-75">
            Multiple files supported • Large files welcome • Resumable transfers
          </p>
        </div>
      </div>
      
      {/* Corner indicators */}
      <div className="absolute top-4 left-4 w-12 h-12 border-l-4 border-t-4 border-blue-400 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-12 h-12 border-r-4 border-t-4 border-blue-400 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-l-4 border-b-4 border-blue-400 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r-4 border-b-4 border-blue-400 rounded-br-lg" />
    </div>
  );
}