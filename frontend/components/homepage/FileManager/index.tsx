"use client";

import React, { useEffect } from "react";
import LoadingSpinner from "../LoadingSpinner";
import FileManagerContent from "./FileManagerContent";
import { useFileData } from "./useFileData";
import { useFileSelection } from "./useFileSelection";
import { useFileFiltering } from "./useFileFiltering";
import { useFileOperations } from "./useFileOperations";
import { useAudioOperations } from "./useAudioOperations";

export default function FileManager() {
  const {
    currentPath,
    loading,
    error,
    setError,
    allItems,
    hasMore,
    loadingMore,
    loadMoreItems,
    navigate,
    navigateUp,
    refreshDirectory,
  } = useFileData();

  const {
    selectedItems,
    highlightedItem,
    selectItem,
    highlightItem,
    selectAll,
    clearSelection,
  } = useFileSelection();

  const {
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    searchQuery,
    setSearchQuery,
    showHidden,
    filterAndSortItems,
    handleSortChange,
    toggleHidden,
  } = useFileFiltering();

  const filteredItems = filterAndSortItems(allItems);

  const fileOperations = useFileOperations({
    currentPath,
    selectedItems,
    allItems,
    refreshDirectory,
    clearSelection,
    setError,
  });

  const {
    audioFiles,
    selectedAudioFiles,
    handlePlayAllAudio,
    handlePlaySelectedAudio,
    handleAudioPlay,
  } = useAudioOperations({
    filteredItems,
    selectedItems,
    currentPath,
  });

  const handleSelectAll = () => selectAll(filteredItems);

  // Add keyboard shortcut for select all (Cmd+A / Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not focused on an input element and if we have items to select
      const target = event.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' || 
        target?.tagName === 'TEXTAREA' || 
        target?.contentEditable === 'true' ||
        filteredItems.length === 0
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();
        handleSelectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, handleSelectAll]);

  if (loading && allItems.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <FileManagerContent
      currentPath={currentPath}
      loading={loading}
      error={error}
      setError={setError}
      filteredItems={filteredItems}
      selectedItems={selectedItems}
      highlightedItem={highlightedItem}
      viewMode={viewMode}
      setViewMode={setViewMode}
      sortBy={sortBy}
      sortOrder={sortOrder}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      showHidden={showHidden}
      hasMore={hasMore}
      loadingMore={loadingMore}
      audioFiles={audioFiles}
      selectedAudioFiles={selectedAudioFiles}
      onNavigate={navigate}
      onNavigateUp={navigateUp}
      onSelectItem={selectItem}
      onHighlightItem={highlightItem}
      onSelectAll={handleSelectAll}
      onClearSelection={clearSelection}
      onSortChange={handleSortChange}
      onToggleHidden={toggleHidden}
      onLoadMore={loadMoreItems}
      onRefresh={refreshDirectory}
      onDeleteSelected={fileOperations.deleteSelected}
      onDownloadSelected={fileOperations.downloadSelected}
      onCreateFolder={fileOperations.createFolder}
      onCreateFile={fileOperations.createFile}
      onMoveCopy={fileOperations.handleMoveCopy}
      onRename={fileOperations.handleRename}
      onDeleteItem={fileOperations.deleteItem}
      onDownloadItem={fileOperations.downloadItem}
      onPlayAllAudio={handlePlayAllAudio}
      onPlaySelectedAudio={handlePlaySelectedAudio}
      onAudioPlay={handleAudioPlay}
      onUploadComplete={refreshDirectory}
    />
  );
}