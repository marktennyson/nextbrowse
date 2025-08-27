"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";

interface UploadDropzoneProps {
  onUpload: (files: FileList) => void;
  children: React.ReactNode;
}

export default function UploadDropzone({
  onUpload,
  children,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleFileUpload = (e: CustomEvent) => {
      if (e.detail && e.detail instanceof FileList) {
        onUpload(e.detail);
      }
    };

    document.addEventListener("fileUpload", handleFileUpload as EventListener);
    return () => {
      document.removeEventListener(
        "fileUpload",
        handleFileUpload as EventListener
      );
    };
  }, [onUpload]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative transition-all duration-300 ${
        isDragging ? "drag-over" : ""
      }`}
    >
      {children}

      {isDragging && (
        <div className="absolute inset-0 glass bg-white/80 dark:bg-white/5 border-2 border-dashed border-blue-300 dark:border-white/20 rounded-xl flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative mb-6">
              <CloudArrowUpIcon className="h-20 w-20 text-blue-500 dark:text-slate-200 mx-auto" />
            </div>
            <p className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-3">
              Drop files to upload
            </p>
            <p className="text-sm text-slate-600 dark:text-gray-300">
              Release to start transfer
            </p>
          </div>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="absolute inset-0 glass bg-white/80 dark:bg-white/5 flex items-center justify-center z-40 rounded-xl">
          <div className="text-center">
            <DocumentArrowUpIcon className="h-12 w-12 text-blue-500 dark:text-slate-200 mx-auto mb-4" />
            <div className="w-80 bg-slate-200 dark:bg-gray-700 rounded-full h-3 mb-4 border border-slate-300 dark:border-white/10">
              <div
                className="bg-blue-500 dark:bg-sky-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
              Uploading... {uploadProgress}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
