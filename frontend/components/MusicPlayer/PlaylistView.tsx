"use client";
import React from "react";
import { QueueListIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/outline";
import { PlaylistViewProps } from "./types";

export default function PlaylistView({
  playlist,
  currentTrack,
  isPlaying,
  onTrackSelect,
}: PlaylistViewProps) {
  return (
    <div className="h-72 bg-slate-950/50 border-t border-white/10 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-white font-medium mb-3 flex items-center">
          <QueueListIcon className="w-5 h-5 mr-2" />
          Playlist ({playlist.length} tracks)
        </h3>
        <div className="space-y-1">
          {playlist.map((track, index) => {
            const isActive = currentTrack?.path === track.path;
            return (
              <div
                key={track.path}
                onClick={() => onTrackSelect(index)}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors group ${
                  isActive
                    ? "bg-blue-500/15 ring-1 ring-blue-400/30"
                    : "hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center mr-3">
                  {isActive && isPlaying ? (
                    <div className="flex gap-0.5 items-end">
                      <div className="w-1 bg-white rounded-full animate-[pulse_1s_ease-in-out_infinite] h-3" />
                      <div
                        className="w-1 bg-white rounded-full animate-[pulse_1s_ease-in-out_infinite] h-4"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <div
                        className="w-1 bg-white rounded-full animate-[pulse_1s_ease-in-out_infinite] h-2"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                  ) : (
                    <span className="text-white text-xs font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium truncate text-sm ${
                      isActive ? "text-blue-300" : "text-white"
                    }`}
                  >
                    {track.name}
                  </div>
                  <div className="text-slate-400 text-xs truncate">
                    {track.path}
                  </div>
                </div>
                {isActive && (
                  <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPlaying ? (
                      <PauseIcon className="w-4 h-4 text-blue-300" />
                    ) : (
                      <PlayIcon className="w-4 h-4 text-blue-300" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}