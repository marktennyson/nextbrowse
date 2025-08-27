"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  QueueListIcon,
  XMarkIcon,
  ChevronUpIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";

export interface AudioTrack {
  name: string;
  url: string;
  path: string;
  duration?: number;
}

interface MusicPlayerProps {
  currentTrack: AudioTrack | null;
  playlist: AudioTrack[];
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTrackSelect: (index: number) => void;
  onClose: () => void;
  onShuffle: () => void;
  shuffled: boolean;
}

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      setIsLoading(true);
    }
  }, [currentTrack]);

  // Play/pause control
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          setIsLoading(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    onNext();
  }, [onNext]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    if (isPlaying && audioRef.current) {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  // Seek functionality
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  // Volume control
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Format time helper
  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Get current track index
  const currentIndex = currentTrack ? playlist.findIndex(t => t.path === currentTrack.path) : -1;

  if (!currentTrack) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${isExpanded ? 'h-96' : 'h-20'}`}>
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onCanPlay={handleCanPlay}
        onLoadStart={handleLoadStart}
        preload="metadata"
      />
      
      {/* Main Player Bar */}
      <div className="glass border-t border-white/10 px-4 py-3">
        {/* Compact View */}
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div 
            className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <SpeakerWaveIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-medium truncate text-sm">
                {currentTrack.name}
              </div>
              <div className="text-slate-400 text-xs">
                {currentIndex + 1} of {playlist.length}
              </div>
            </div>
            <ChevronUpIcon 
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={onPrevious}
              disabled={currentIndex <= 0}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <BackwardIcon className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <PauseIcon className="w-5 h-5 text-white" />
              ) : (
                <PlayIcon className="w-5 h-5 text-white" />
              )}
            </button>
            
            <button
              onClick={onNext}
              disabled={currentIndex >= playlist.length - 1}
              className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ForwardIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={onShuffle}
              className={`p-2 rounded-lg transition-colors ${
                shuffled ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5 text-slate-400'
              }`}
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
            >
              <QueueListIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-3 mt-3">
          <span className="text-xs text-slate-400 w-10">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(currentTime / duration) * 100}%, rgb(255 255 255 / 0.1) ${(currentTime / duration) * 100}%, rgb(255 255 255 / 0.1) 100%)`
              }}
            />
          </div>
          <span className="text-xs text-slate-400 w-10">
            {formatTime(duration)}
          </span>
          
          {/* Volume Control */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={toggleMute}
              className="p-1 rounded hover:bg-white/5 transition-colors"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(isMuted ? 0 : volume) * 100}%, rgb(255 255 255 / 0.1) ${(isMuted ? 0 : volume) * 100}%, rgb(255 255 255 / 0.1) 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Playlist View */}
      {(isExpanded || showPlaylist) && (
        <div className="h-76 bg-slate-900/95 border-t border-white/10 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-medium mb-3 flex items-center">
              <QueueListIcon className="w-5 h-5 mr-2" />
              Playlist ({playlist.length} tracks)
            </h3>
            <div className="space-y-1">
              {playlist.map((track, index) => (
                <div
                  key={track.path}
                  onClick={() => onTrackSelect(index)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    currentTrack.path === track.path
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center mr-3">
                    {currentTrack.path === track.path && isPlaying ? (
                      <div className="flex space-x-0.5">
                        <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0s' }}></div>
                        <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '0.1s' }}></div>
                        <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0.2s' }}></div>
                      </div>
                    ) : (
                      <span className="text-white text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate text-sm ${
                      currentTrack.path === track.path ? 'text-blue-400' : 'text-white'
                    }`}>
                      {track.name}
                    </div>
                    <div className="text-slate-400 text-xs truncate">
                      {track.path}
                    </div>
                  </div>
                  {currentTrack.path === track.path && (
                    <div className="ml-2">
                      {isPlaying ? (
                        <PauseIcon className="w-4 h-4 text-blue-400" />
                      ) : (
                        <PlayIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}