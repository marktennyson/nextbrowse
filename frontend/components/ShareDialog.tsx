"use client";
import React, { useState } from "react";
import {
  XMarkIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LockClosedIcon,
  ClockIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

interface ShareDialogProps {
  open: boolean;
  item?: {
    name: string;
    type: "file" | "dir";
    path?: string;
  };
  onClose: () => void;
  onCreateShare: (shareData: ShareConfig) => Promise<{ shareId: string; shareUrl: string } | null>;
}

interface ShareConfig {
  path: string;
  password?: string;
  expiresIn?: number; // seconds
  allowUploads?: boolean;
  disableViewer?: boolean;
  quickDownload?: boolean;
  title?: string;
  description?: string;
  theme?: string;
  viewMode?: 'list' | 'grid';
}

export default function ShareDialog({
  open,
  item,
  onClose,
  onCreateShare,
}: ShareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Form state
  const [password, setPassword] = useState("");
  const [expirationValue, setExpirationValue] = useState("");
  const [expirationUnit, setExpirationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [allowUploads, setAllowUploads] = useState(false);
  const [disableViewer, setDisableViewer] = useState(false);
  const [quickDownload, setQuickDownload] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const handleCreateShare = async () => {
    if (!item) return;

    setLoading(true);
    
    // Calculate expiration in seconds
    let expiresIn: number | undefined;
    if (expirationValue) {
      const value = parseInt(expirationValue);
      if (!isNaN(value)) {
        switch (expirationUnit) {
          case 'minutes':
            expiresIn = value * 60;
            break;
          case 'hours':
            expiresIn = value * 60 * 60;
            break;
          case 'days':
            expiresIn = value * 60 * 60 * 24;
            break;
        }
      }
    }

    const shareData: ShareConfig = {
      path: item.path || `/${item.name}`,
      password: password || undefined,
      expiresIn,
      allowUploads: item.type === 'dir' ? allowUploads : undefined,
      disableViewer,
      quickDownload,
      title: title || undefined,
      description: description || undefined,
      viewMode: item.type === 'dir' ? viewMode : undefined,
    };

    const result = await onCreateShare(shareData);
    
    if (result) {
      setShareUrl(result.shareUrl);
    }
    
    setLoading(false);
  };

  const handleCopyUrl = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy URL:", error);
      }
    }
  };

  const resetForm = () => {
    setPassword("");
    setExpirationValue("");
    setExpirationUnit('hours');
    setAllowUploads(false);
    setDisableViewer(false);
    setQuickDownload(true);
    setTitle("");
    setDescription("");
    setViewMode('grid');
    setShareUrl(null);
    setCopied(false);
    setShowAdvanced(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900/95 rounded-2xl border border-zinc-800/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 ring-1 ring-inset ring-blue-500/20 grid place-items-center">
              <ShareIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Share Item</h2>
              <p className="text-sm text-zinc-400 truncate max-w-[200px]" title={item.name}>
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {shareUrl ? (
            /* Share URL Result */
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
                  <CheckIcon className="h-4 w-4" />
                  Share Created Successfully
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm font-mono text-zinc-200"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            /* Share Configuration Form */
            <div className="space-y-4">
              {/* Basic Settings */}
              <div className="space-y-3">
                {/* Password */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-2">
                    <LockClosedIcon className="h-4 w-4" />
                    Password Protection (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-200 mb-2">
                    <ClockIcon className="h-4 w-4" />
                    Expiration (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Duration"
                      min="1"
                      value={expirationValue}
                      onChange={(e) => setExpirationValue(e.target.value)}
                      className="flex-1 bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <select
                      value={expirationUnit}
                      onChange={(e) => setExpirationUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                      className="bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <CogIcon className="h-4 w-4" />
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t border-zinc-800/60">
                  {/* Basic Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={quickDownload}
                        onChange={(e) => setQuickDownload(e.target.checked)}
                        className="rounded border-zinc-700"
                      />
                      <span className="text-sm text-zinc-200">Quick Download</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={disableViewer}
                        onChange={(e) => setDisableViewer(e.target.checked)}
                        className="rounded border-zinc-700"
                      />
                      <span className="text-sm text-zinc-200">Disable File Viewer</span>
                    </label>
                    {item.type === 'dir' && (
                      <>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allowUploads}
                            onChange={(e) => setAllowUploads(e.target.checked)}
                            className="rounded border-zinc-700"
                          />
                          <span className="text-sm text-zinc-200">Allow Uploads</span>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Custom Title & Description */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Custom title (optional)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    />
                  </div>

                  {/* View Mode for Directories */}
                  {item.type === 'dir' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-2">
                        Default View Mode
                      </label>
                      <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as 'list' | 'grid')}
                        className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="grid">Grid View</option>
                        <option value="list">List View</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateShare}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShareIcon className="h-4 w-4" />
                  )}
                  Create Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}