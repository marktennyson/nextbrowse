"use client";
import React from "react";

// Import all toolbar components
import NavigationButtons from "./NavigationButtons";
import CreateFolderButton from "./CreateFolderButton";
import CreateFileButton from "./CreateFileButton";
import UploadButton from "./UploadButton";
import SelectionActions from "./SelectionActions";
import ViewModeToggle from "./ViewModeToggle";
import SortControl from "./SortControl";
import HiddenFilesToggle from "./HiddenFilesToggle";
import PlayAudioButton from "./PlayAudioButton";
import Divider from "./Divider";

interface ToolbarProps {
  selectedCount: number;
  viewMode: "grid" | "list";
  sortBy: "name" | "kind" | "size" | "date";
  sortOrder: "asc" | "desc";
  showHidden: boolean;
  audioCount?: number;
  selectedAudioCount?: number;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortChange: (
    by: "name" | "kind" | "size" | "date",
    order: "asc" | "desc"
  ) => void;
  onToggleHidden: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onCreateFolder: (name: string) => void;
  onCreateFile: (name: string) => void;
  onUpload: (files: FileList) => void;
  onRefresh: () => void;
  onNavigateUp: () => void;
  onPlayAllAudio?: () => void;
  onPlaySelectedAudio?: () => void;
  canNavigateUp: boolean;
}

export default function Toolbar({
  selectedCount,
  viewMode,
  sortBy,
  sortOrder,
  showHidden,
  audioCount = 0,
  selectedAudioCount = 0,
  onViewModeChange,
  onSortChange,
  onToggleHidden,
  onSelectAll,
  onClearSelection,
  onDelete,
  onMove,
  onCopy,
  onDownload,
  onCreateFolder,
  onCreateFile,
  onUpload,
  onRefresh,
  onNavigateUp,
  onPlayAllAudio,
  onPlaySelectedAudio,
  canNavigateUp,
}: ToolbarProps) {
  return (
    <div className="glass rounded-lg sm:rounded-xl shadow-lg shadow-slate-900/20 mb-3 sm:mb-4" style={{background: 'var(--glass-bg)', border: '1px solid var(--glass-border)'}}>
      <div className="p-2 sm:p-4">
        {/* Main toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 md:gap-4">
          {/* Left side - Navigation & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <NavigationButtons
              canNavigateUp={canNavigateUp}
              onNavigateUp={onNavigateUp}
              onRefresh={onRefresh}
            />

            <Divider className="mx-0.5 sm:mx-1" />

            <CreateFolderButton onCreateFolder={onCreateFolder} />
            
            <CreateFileButton onCreateFile={onCreateFile} />
            
            <UploadButton onFilesSelected={onUpload} />

            <PlayAudioButton
              audioCount={audioCount}
              selectedAudioCount={selectedAudioCount}
              onPlayAll={onPlayAllAudio || (() => {})}
              onPlaySelected={onPlaySelectedAudio || (() => {})}
            />

            <SelectionActions
              selectedCount={selectedCount}
              onMove={onMove}
              onCopy={onCopy}
              onDelete={onDelete}
              onDownload={onDownload}
              onClearSelection={onClearSelection}
              onSelectAll={onSelectAll}
            />

            {selectedCount > 0 && <Divider className="mx-0.5 sm:mx-1" />}
          </div>

          {/* Right side - View & Sort Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />

            <SortControl
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />


            <HiddenFilesToggle
              showHidden={showHidden}
              onToggleHidden={onToggleHidden}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
