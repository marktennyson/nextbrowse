"use client";
import React from "react";
import { MusicalNoteIcon } from "@heroicons/react/24/outline";

interface PlayAudioButtonProps {
  audioCount: number;
  selectedAudioCount: number;
  onPlayAll: () => void;
  onPlaySelected: () => void;
}

export default function PlayAudioButton({
  audioCount,
  selectedAudioCount,
  onPlayAll,
  onPlaySelected,
}: PlayAudioButtonProps) {
  // Don't show if no audio files
  if (audioCount === 0) return null;

  return (
    <div className="flex items-center space-x-1">
      {selectedAudioCount > 0 ? (
        <button
          onClick={onPlaySelected}
          className="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-green-400 hover:text-green-300 hover:bg-white/5 rounded-lg transition-colors"
          title={`Play ${selectedAudioCount} selected audio file${
            selectedAudioCount !== 1 ? "s" : ""
          }`}
        >
          <MusicalNoteIcon className="h-4 w-4 text-green-500 transition-all duration-300 hover:text-green-400 hover:scale-110 hover:rotate-12" />
          <span>Play Selected ({selectedAudioCount})</span>
        </button>
      ) : (
        <button
          onClick={onPlayAll}
          className="flex items-center space-x-1.5 px-3 py-2 sm:py-2.5 text-sm font-medium text-green-400 hover:text-green-300 hover:bg-white/5 rounded-lg transition-colors"
          title={`Play all ${audioCount} audio file${
            audioCount !== 1 ? "s" : ""
          } in folder`}
        >
          <MusicalNoteIcon className="h-4 w-4 text-green-500 transition-all duration-300 hover:text-green-400 hover:scale-110 hover:rotate-12" />
          <span>Play All ({audioCount})</span>
        </button>
      )}
    </div>
  );
}
