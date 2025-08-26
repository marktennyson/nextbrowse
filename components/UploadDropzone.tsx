"use client";
import React, { useState, useRef, useEffect } from "react";
import { CloudArrowUpIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";

interface UploadDropzoneProps {
  onUpload: (files: FileList) => void;
  children: React.ReactNode;
}

export default function UploadDropzone({ onUpload, children }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleFileUpload = (e: CustomEvent) => {
      if (e.detail && e.detail instanceof FileList) {
        onUpload(e.detail);
      }
    };

    document.addEventListener('fileUpload', handleFileUpload as EventListener);
    return () => {
      document.removeEventListener('fileUpload', handleFileUpload as EventListener);
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
      className={`relative transition-all duration-200 ${
        isDragging
          ? "bg-blue-50 border-2 border-dashed border-blue-300"
          : ""
      }`}
    >
      {children}
      
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center z-50">
          <div className="text-center">
            <CloudArrowUpIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-blue-600 mb-2">Drop files to upload</p>
            <p className="text-sm text-blue-500">Release to upload files to the current directory</p>
          </div>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-center">
            <DocumentArrowUpIcon className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
            <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}