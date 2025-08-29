"use client";
import React, { useState } from "react";
import { MusicPlayerProps } from "./types";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import TrackInfo from "./TrackInfo";
import TransportControls from "./TransportControls";
import ProgressBar from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import PlayerActions from "./PlayerActions";
import PlaylistView from "./PlaylistView";

export default function MusicPlayer({
  currentTrack,
  playlist,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onTrackSelect,
  onClose,
  onShuffle,
  shuffled,
}: MusicPlayerProps) {
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    audioRef,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    repeat,
    rate,
    currentIndex,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleEnded,
    handleCanPlay,
    handleLoadStart,
    handleSeek,
    skipBy,
    handleVolumeChange,
    toggleMute,
    cycleRate,
    cycleRepeat,
  } = useAudioPlayer({
    currentTrack,
    playlist,
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    onTrackSelect,
  });

  if (!currentTrack) return null;

  return (
    <div
      className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(1024px,96vw)] transition-all duration-300 ${
        isExpanded ? "h-[28rem]" : "h-24"
      }`}
    >
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onCanPlay={handleCanPlay}
        onLoadStart={handleLoadStart}
        preload="auto"
      />

      <div className="rounded-2xl overflow-hidden backdrop-blur-xl bg-slate-900/70 ring-1 ring-white/10 shadow-2xl">
        <div className="px-4 py-3 flex items-center justify-between">
          <TrackInfo
            currentTrack={currentTrack}
            currentIndex={currentIndex}
            playlistLength={playlist.length}
            isPlaying={isPlaying}
            isLoading={isLoading}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded((v) => !v)}
          />

          <TransportControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            currentIndex={currentIndex}
            playlistLength={playlist.length}
            repeat={repeat}
            onPlay={onPlay}
            onPause={onPause}
            onNext={onNext}
            onPrevious={onPrevious}
            onSkipBy={skipBy}
          />

          <PlayerActions
            shuffled={shuffled}
            repeat={repeat}
            onShuffle={onShuffle}
            onCycleRepeat={cycleRepeat}
            onTogglePlaylist={() => setShowPlaylist((v) => !v)}
            onClose={onClose}
          />
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />

            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              rate={rate}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
              onCycleRate={cycleRate}
            />
          </div>
        </div>

        {(isExpanded || showPlaylist) && (
          <PlaylistView
            playlist={playlist}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTrackSelect={onTrackSelect}
          />
        )}
      </div>
    </div>
  );
}