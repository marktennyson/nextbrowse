"use client";
import React from "react";
import {
  ArrowsRightLeftIcon,
  BoltIcon,
  QueueListIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PlayerActionsProps } from "./types";

export default function PlayerActions({
  shuffled,
  repeat,
  onShuffle,
  onCycleRepeat,
  onTogglePlaylist,
  onClose,
}: PlayerActionsProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <button
        onClick={onShuffle}
        className={`p-2 rounded-lg transition-colors ${
          shuffled
            ? "bg-blue-500/20 text-blue-400"
            : "hover:bg-white/5 text-slate-400"
        }`}
        title="Shuffle"
      >
        <ArrowsRightLeftIcon className="w-4 h-4" />
      </button>

      <button
        onClick={onCycleRepeat}
        className={`p-2 rounded-lg transition-colors ${
          repeat !== "off"
            ? "bg-emerald-500/20 text-emerald-400"
            : "hover:bg-white/5 text-slate-400"
        }`}
        title={`Repeat: ${repeat}`}
      >
        <BoltIcon className="w-4 h-4" />
      </button>

      <button
        onClick={onTogglePlaylist}
        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        title="Toggle playlist"
      >
        <QueueListIcon className="w-4 h-4" />
      </button>

      <button
        onClick={onClose}
        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
        title="Close player"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}