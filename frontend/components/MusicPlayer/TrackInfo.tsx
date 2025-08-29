"use client";
import React from "react";
import { SpeakerWaveIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { TrackInfoProps } from "./types";

export default function TrackInfo({
  currentTrack,
  currentIndex,
  playlistLength,
  isPlaying,
  isLoading,
  isExpanded,
  onToggleExpanded,
}: TrackInfoProps) {
  return (
    <div
      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
      onClick={onToggleExpanded}
      title="Expand / collapse"
    >
      <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
        ) : (
          <SpeakerWaveIcon className="w-6 h-6 text-white" />
        )}
        {isPlaying && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-blue-400/40 animate-pulse" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-white font-medium truncate text-sm">
          {currentTrack.name}
        </div>
        <div className="text-slate-400 text-xs">
          {currentIndex + 1} of {playlistLength}
        </div>
      </div>
      <ChevronUpIcon
        className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
          isExpanded ? "rotate-180" : ""
        }`}
      />
    </div>
  );
}