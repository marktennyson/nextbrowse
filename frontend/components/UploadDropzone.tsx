"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { UploadManager, UploadProgress } from "@/lib/upload-manager";
import FileConflictDialog from "@/components/FileConflictDialog";

interface UploadDropzoneProps {
  onUploadComplete?: () => void;
  targetPath: string;
  children: React.ReactNode;
}

export default function UploadDropzone({
  onUploadComplete,
  targetPath,
  children,
}: UploadDropzoneProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [conflictDialog, setConflictDialog] = useState<{
    fileName: string;
    onReplace: () => void;
    onCancel: () => void;
  } | null>(null);
  const uploadManagerRef = useRef<UploadManager | null>(null);

  // Initialize upload manager
  useEffect(() => {
    uploadManagerRef.current = new UploadManager();

    uploadManagerRef.current.onGlobalProgress((allProgress) => {
      setUploads(allProgress);
      const hasActive = allProgress.some(
        (p) => p.status === "uploading" || p.status === "pending"
      );
      setIsUploading(hasActive);

      if (!hasActive && allProgress.length > 0) {
        const allCompleted = allProgress.every((p) => p.status === "completed");
        if (allCompleted && onUploadComplete) {
          setTimeout(() => {
            onUploadComplete();
            setUploads([]);
          }, 2000);
        }
      }
    });

    uploadManagerRef.current.onConflict((fileName, onReplace, onCancel) => {
      setConflictDialog({ fileName, onReplace, onCancel });
    });

    return () => {
      uploadManagerRef.current = null;
    };
  }, [onUploadComplete]);

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (uploadManagerRef.current) {
        await uploadManagerRef.current.addFiles(files, targetPath);
      }
    },
    [targetPath]
  );

  useEffect(() => {
    const handleFileUploadEvent = (e: CustomEvent<FileList>) => {
      if (e.detail) {
        void handleFileUpload(e.detail);
      }
    };

    document.addEventListener(
      "fileUpload",
      handleFileUploadEvent as EventListener
    );
    return () => {
      document.removeEventListener(
        "fileUpload",
        handleFileUploadEvent as EventListener
      );
    };
  }, [handleFileUpload]);

  // Drag handling is now delegated entirely to GlobalDropzone
  // which communicates with this component via the fileUpload custom event

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
    return uploadManagerRef.current?.formatBytes(bytes) || "0 B";
  };

  const formatTime = (seconds: number): string => {
    return uploadManagerRef.current?.formatTime(seconds) || "--:--";
  };

  const getStatusIcon = (status: UploadProgress["status"]) => {
    switch (status) {
      case "completed":
        return <ArrowDownTrayIcon className="h-4 w-4 text-green-500" />;
      case "error":
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case "paused":
        return <PauseIcon className="h-4 w-4 text-yellow-500" />;
      case "uploading":
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  // no-op: using native progress element now

  return (
    <div className="relative">
      {children}

      {uploads.length > 0 && (
        <div className="fixed inset-0 z-[90]">
          {/* dim backdrop */}
          <div className="absolute inset-0 bg-black/20" />

          {/* centered panel */}
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-3xl glass bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
              {/* header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  File Uploads (
                  {uploads.filter((u) => u.status === "completed").length}/
                  {uploads.length})
                </h3>
                <button
                  onClick={() => {
                    // Cancel all uploads via UploadManager, then clear UI
                    const mgr = uploadManagerRef.current;
                    if (mgr) {
                      for (const u of uploads) {
                        try {
                          mgr.cancelUpload(u.fileId);
                        } catch {
                          // ignore
                        }
                      }
                    }
                    setUploads([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close uploads"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              {/* list */}
              <div className="px-5 sm:px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
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
                        {upload.status === "uploading" && (
                          <button
                            onClick={() => pauseUpload(upload.fileId)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label={`Pause upload ${upload.fileName}`}
                          >
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        )}
                        {upload.status === "paused" && (
                          <button
                            onClick={() => resumeUpload(upload.fileId)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label={`Resume upload ${upload.fileName}`}
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}
                        {(upload.status === "pending" ||
                          upload.status === "uploading" ||
                          upload.status === "paused") && (
                          <button
                            onClick={() => cancelUpload(upload.fileId)}
                            className="text-red-400 hover:text-red-600"
                            aria-label={`Cancel upload ${upload.fileName}`}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <progress
                      className="w-full h-2 mb-2 block"
                      value={Math.max(
                        0,
                        Math.min(100, Math.round(upload.progress))
                      )}
                      max={100}
                    />

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{upload.progress.toFixed(1)}%</span>
                      {upload.status === "uploading" && (
                        <div className="flex items-center space-x-4">
                          <span>{formatBytes(upload.speed)}/s</span>
                          <span>
                            {formatTime(upload.timeRemaining)} remaining
                          </span>
                        </div>
                      )}
                      {upload.status === "completed" && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Complete
                        </span>
                      )}
                      {upload.status === "error" && (
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {upload.error || "Upload failed"}
                          </span>
                          {upload.error === "file exists" && (
                            <div className="flex items-center space-x-2 ml-2">
                              <button
                                onClick={() =>
                                  uploadManagerRef.current?.retryWithReplace(
                                    upload.fileId
                                  )
                                }
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                              >
                                Replace
                              </button>
                              <button
                                onClick={() => cancelUpload(upload.fileId)}
                                className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {upload.status === "paused" && (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          Paused
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* footer summary */}
              {uploads.length > 0 && (
                <div className="px-5 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Total:{" "}
                      {formatBytes(
                        uploads.reduce((acc, u) => acc + u.fileSize, 0)
                      )}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Uploaded:{" "}
                      {formatBytes(
                        uploads.reduce((acc, u) => acc + u.uploadedBytes, 0)
                      )}
                    </span>
                    {isUploading && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {formatBytes(
                          uploads.reduce((acc, u) => acc + (u.speed || 0), 0)
                        )}
                        /s
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <FileConflictDialog
        open={conflictDialog !== null}
        fileName={conflictDialog?.fileName || ""}
        onClose={() => {
          conflictDialog?.onCancel();
          setConflictDialog(null);
        }}
        onReplace={() => {
          conflictDialog?.onReplace();
          setConflictDialog(null);
        }}
      />
    </div>
  );
}
