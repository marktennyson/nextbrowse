"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  CloudArrowUpIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { UploadManager, UploadProgress } from "@/lib/upload-manager";

interface UploadDropzoneProps {
  onUpload: (files: FileList) => void;
  onUploadComplete?: () => void;
  targetPath: string;
  children: React.ReactNode;
}

export default function UploadDropzone({
  onUpload,
  onUploadComplete,
  targetPath,
  children,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounterRef = useRef(0);
  const uploadManagerRef = useRef<UploadManager | null>(null);

  // Initialize upload manager
  useEffect(() => {
    uploadManagerRef.current = new UploadManager();
    
    uploadManagerRef.current.onGlobalProgress((allProgress) => {
      setUploads(allProgress);
      const hasActive = allProgress.some(p => p.status === 'uploading' || p.status === 'pending');
      setIsUploading(hasActive);
      
      if (!hasActive && allProgress.length > 0) {
        const allCompleted = allProgress.every(p => p.status === 'completed');
        if (allCompleted && onUploadComplete) {
          setTimeout(() => {
            onUploadComplete();
            setUploads([]);
          }, 2000);
        }
      }
    });
    
    return () => {
      uploadManagerRef.current = null;
    };
  }, [onUploadComplete]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (uploadManagerRef.current) {
      await uploadManagerRef.current.addFiles(files, targetPath);
    }
    onUpload(files);
  }, [targetPath, onUpload]);

  useEffect(() => {
    const handleFileUploadEvent = (e: CustomEvent<FileList>) => {
      if (e.detail) {
        void handleFileUpload(e.detail);
      }
    };

    document.addEventListener("fileUpload", handleFileUploadEvent as EventListener);
    return () => {
      document.removeEventListener(
        "fileUpload",
        handleFileUploadEvent as EventListener
      );
    };
  }, [handleFileUpload]);

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
      void handleFileUpload(e.dataTransfer.files);
    }
  };


  const pauseUpload = (fileId: string) => {
    uploadManagerRef.current?.pauseUpload(fileId);
  };

  const resumeUpload = (fileId: string) => {
    uploadManagerRef.current?.resumeUpload(fileId);
  };

  const cancelUpload = (fileId: string) => {
    uploadManagerRef.current?.cancelUpload(fileId);
  };

  const formatBytes = (bytes: number): string => {
    return uploadManagerRef.current?.formatBytes(bytes) || '0 B';
  };

  const formatTime = (seconds: number): string => {
    return uploadManagerRef.current?.formatTime(seconds) || '--:--';
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <ArrowDownTrayIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <PauseIcon className="h-4 w-4 text-yellow-500" />;
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'uploading': return 'bg-blue-500';
      default: return 'bg-gray-300';
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

      {uploads.length > 0 && (
        <div className="absolute inset-0 glass bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-40 rounded-xl p-6 overflow-y-auto">
          <div className="max-h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                File Uploads ({uploads.filter(u => u.status === 'completed').length}/{uploads.length})
              </h3>
              <button
                onClick={() => setUploads([])}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={isUploading}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {uploads.map((upload) => (
                <div
                  key={upload.fileId}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {upload.fileName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(upload.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      {getStatusIcon(upload.status)}
                      {upload.status === 'uploading' && (
                        <button
                          onClick={() => pauseUpload(upload.fileId)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <PauseIcon className="h-4 w-4" />
                        </button>
                      )}
                      {upload.status === 'paused' && (
                        <button
                          onClick={() => resumeUpload(upload.fileId)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      )}
                      {(upload.status === 'pending' || upload.status === 'uploading' || upload.status === 'paused') && (
                        <button
                          onClick={() => cancelUpload(upload.fileId)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(upload.status)}`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{upload.progress.toFixed(1)}%</span>
                    {upload.status === 'uploading' && (
                      <div className="flex items-center space-x-4">
                        <span>{formatBytes(upload.speed)}/s</span>
                        <span>{formatTime(upload.timeRemaining)} remaining</span>
                      </div>
                    )}
                    {upload.status === 'completed' && (
                      <span className="text-green-600 dark:text-green-400 font-medium">Complete</span>
                    )}
                    {upload.status === 'error' && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {upload.error || 'Upload failed'}
                      </span>
                    )}
                    {upload.status === 'paused' && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium">Paused</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {uploads.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total: {formatBytes(uploads.reduce((acc, u) => acc + u.fileSize, 0))}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Uploaded: {formatBytes(uploads.reduce((acc, u) => acc + u.uploadedBytes, 0))}
                  </span>
                  {isUploading && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      {formatBytes(uploads.reduce((acc, u) => acc + (u.speed || 0), 0))}/s
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
