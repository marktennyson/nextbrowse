"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  LockClosedIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

interface ShareData {
  type: "file" | "dir";
  name?: string;
  path?: string;
  size?: number;
  mtime?: number;
  items?: FileItem[];
  downloadUrl?: string;
  shareConfig: {
    allowUploads?: boolean;
    disableViewer?: boolean;
    quickDownload?: boolean;
    title?: string;
    description?: string;
    theme?: string;
    viewMode?: 'list' | 'grid';
  };
}

export default function SharePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [loading, setLoading] = useState(true);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    loadShareInfo();
  }, [shareId]);

  const loadShareInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/fs/share/${shareId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError("Share not found");
        } else if (response.status === 410) {
          setError("Share has expired");
        } else {
          setError(data.error || "Failed to load share");
        }
        return;
      }

      if (data.share.hasPassword) {
        setRequiresPassword(true);
      } else {
        await loadShareContent();
      }
    } catch {
      setError("Network error loading share");
    } finally {
      setLoading(false);
    }
  };

  const loadShareContent = async (sharePassword?: string) => {
    try {
      setLoading(true);
      setPasswordError(null);

      const response = await fetch(`/api/fs/share/${shareId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sharePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPasswordError("Invalid password");
        } else {
          setError(data.error || "Failed to access share");
        }
        return;
      }

      setShareData(data);
      setRequiresPassword(false);
    } catch {
      setError("Network error accessing share");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadShareContent(password);
    }
  };

  const handleDownload = (url: string, fileName?: string) => {
    const link = document.createElement("a");
    link.href = url;
    if (fileName) {
      link.download = fileName;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading share...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">Share Unavailable</h1>
            <p className="text-zinc-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8">
            <div className="text-center mb-6">
              <LockClosedIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-zinc-100 mb-2">Protected Share</h1>
              <p className="text-zinc-400">This share is password protected</p>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-400">{passwordError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!password.trim() || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg px-4 py-3 font-medium transition-colors"
              >
                Access Share
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            {shareData.shareConfig.title || (shareData.type === 'dir' ? `Shared Folder: ${shareData.path}` : `Shared File: ${shareData.name}`)}
          </h1>
          {shareData.shareConfig.description && (
            <p className="text-zinc-400">{shareData.shareConfig.description}</p>
          )}
        </div>

        {shareData.type === 'file' ? (
          /* File Share */
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DocumentIcon className="h-12 w-12 text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">{shareData.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    {shareData.size && <span>{formatFileSize(shareData.size)}</span>}
                    {shareData.mtime && <span>Modified {formatDate(shareData.mtime)}</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!shareData.shareConfig.disableViewer && shareData.downloadUrl && (
                  <button
                    onClick={() => window.open(shareData.downloadUrl!, "_blank")}
                    className="flex items-center gap-2 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Preview
                  </button>
                )}
                {shareData.downloadUrl && (
                  <button
                    onClick={() => handleDownload(shareData.downloadUrl!, shareData.name)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Directory Share */
          <div className="space-y-4">
            {shareData.items && shareData.items.length > 0 ? (
              <div className={`grid gap-4 ${shareData.shareConfig.viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {shareData.items.map((item) => (
                  <div
                    key={item.name}
                    className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {item.type === 'dir' ? (
                        <FolderIcon className="h-8 w-8 text-blue-400" />
                      ) : (
                        <DocumentIcon className="h-8 w-8 text-zinc-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-zinc-100 truncate" title={item.name}>
                          {item.name}
                        </h3>
                        <div className="text-xs text-zinc-400">
                          {item.size && formatFileSize(item.size)}
                        </div>
                      </div>
                    </div>
                    
                    {item.type === 'file' && item.url && (
                      <div className="flex gap-2">
                        {!shareData.shareConfig.disableViewer && (
                          <button
                            onClick={() => window.open(item.url!, "_blank")}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            <EyeIcon className="h-4 w-4" />
                            View
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(item.url!, item.name)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    )}
                    
                    {item.type === 'dir' && (
                      <button
                        onClick={() => handleDownload(`/api/fs/share/${shareId}/download?path=${encodeURIComponent(item.name)}`, `${item.name}.zip`)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download ZIP
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-12 text-center">
                <FolderIcon className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                <p className="text-zinc-400">This folder is empty</p>
              </div>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 text-center text-sm text-zinc-500">
          Powered by NextBrowse
        </div>
      </div>
    </div>
  );
}