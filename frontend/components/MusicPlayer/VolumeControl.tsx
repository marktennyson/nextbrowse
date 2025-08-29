"use client";
import React from "react";
import { SpeakerWaveIcon, SpeakerXMarkIcon } from "@heroicons/react/24/outline";
import { VolumeControlProps } from "./types";

export default function VolumeControl({
  volume,
  isMuted,
  rate,
  onVolumeChange,
  onToggleMute,
  onCycleRate,
}: VolumeControlProps) {
  const pct = (num: number, den: number) => {
    if (!den || !Number.isFinite(den)) return 0;
    const p = (num / den) * 100;
    return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  };

  return (
    <>
      <button
        onClick={onCycleRate}
        className="px-2 py-1 rounded-md text-xs bg-white/5 hover:bg-white/10 text-slate-200"
        title="Change speed"
      >
        {rate.toFixed(2)}x
      </button>

      <div className="flex items-center gap-2 ml-2 min-w-[140px]">
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded hover:bg-white/5 transition-colors"
          title="Mute/Unmute"
        >
          {isMuted ? (
            <SpeakerXMarkIcon className="w-4 h-4 text-slate-300" />
          ) : (
            <SpeakerWaveIcon className="w-4 h-4 text-slate-300" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={onVolumeChange}
          className="w-24 h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${pct(
              isMuted ? 0 : volume,
              1
            )}%, rgb(255 255 255 / 0.1) ${pct(
              isMuted ? 0 : volume,
              1
            )}%, rgb(255 255 255 / 0.1) 100%)`,
          }}
        />
      </div>
    </>
  );
}