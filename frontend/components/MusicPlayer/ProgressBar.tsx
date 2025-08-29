"use client";
import React, { useCallback } from "react";
import { ProgressBarProps } from "./types";

export default function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const formatTime = useCallback((time: number) => {
    if (!Number.isFinite(time) || time <= 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const pct = (num: number, den: number) => {
    if (!den || !Number.isFinite(den)) return 0;
    const p = (num / den) * 100;
    return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-12 text-right">
        {formatTime(currentTime)}
      </span>
      <div className="flex-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={onSeek}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${pct(
              currentTime,
              duration
            )}%, rgb(255 255 255 / 0.1) ${pct(
              currentTime,
              duration
            )}%, rgb(255 255 255 / 0.1) 100%)`,
          }}
        />
      </div>
      <span className="text-xs text-slate-400 w-12">
        {formatTime(duration)}
      </span>
    </div>
  );
}