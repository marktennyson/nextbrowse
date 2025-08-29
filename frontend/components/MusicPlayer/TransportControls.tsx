"use client";
import React from "react";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/outline";
import { TransportControlsProps } from "./types";

export default function TransportControls({
  isPlaying,
  isLoading,
  currentIndex,
  playlistLength,
  repeat,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSkipBy,
}: TransportControlsProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <button
        onClick={() => onSkipBy(-10)}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        title="Back 10s"
      >
        <ArrowUturnLeftIcon className="w-5 h-5 text-white" />
      </button>
      
      <button
        onClick={onPrevious}
        disabled={currentIndex <= 0}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Previous"
      >
        <BackwardIcon className="w-5 h-5 text-white" />
      </button>

      <button
        onClick={isPlaying ? onPause : onPlay}
        disabled={isLoading}
        className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <PauseIcon className="w-5 h-5 text-white" />
        ) : (
          <PlayIcon className="w-5 h-5 text-white" />
        )}
      </button>

      <button
        onClick={onNext}
        disabled={currentIndex >= playlistLength - 1 && repeat !== "all"}
        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Next"
      >
        <ForwardIcon className="w-5 h-5 text-white" />
      </button>
      
      <button
        onClick={() => onSkipBy(10)}
        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        title="Forward 10s"
      >
        <ArrowUturnRightIcon className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}