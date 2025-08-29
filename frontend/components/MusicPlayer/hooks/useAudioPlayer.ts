"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AudioTrack, RepeatMode } from "../types";

interface UseAudioPlayerProps {
  currentTrack: AudioTrack | null;
  playlist: AudioTrack[];
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onTrackSelect: (index: number) => void;
}

export function useAudioPlayer({
  currentTrack,
  playlist,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onTrackSelect,
}: UseAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = window.localStorage.getItem("mp:volume");
    return v ? Math.min(1, Math.max(0, Number(v))) : 1;
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const m = window.localStorage.getItem("mp:muted");
    return m === "1";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [rate, setRate] = useState<number>(1);

  // Memorize current index for stability
  const currentIndex = useMemo(
    () =>
      currentTrack
        ? playlist.findIndex((t) => t.path === currentTrack.path)
        : -1,
    [currentTrack, playlist]
  );

  // Update audio source when track changes
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    const el = audioRef.current;
    // Reset state
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    el.src = currentTrack.url;
    // Align volume/mute/playbackRate immediately
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
    el.playbackRate = rate;
    el.load();
  }, [currentTrack]);

  // Play/pause control coming from parent
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const tryPlay = async () => {
      try {
        await el.play();
      } catch (e) {
        // Autoplay may be blocked; show as paused and stop spinner
        setIsLoading(false);
      }
    };
    if (isPlaying) tryPlay();
    else el.pause();
  }, [isPlaying]);

  // Keep element in sync with volume & mute
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = isMuted ? 0 : volume;
    el.muted = isMuted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mp:volume", String(volume));
      window.localStorage.setItem("mp:muted", isMuted ? "1" : "0");
    }
  }, [volume, isMuted]);

  // Keep element in sync with playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    setDuration(d);
    setIsLoading(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime || 0);
  }, []);

  const handleEnded = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (repeat === "one") {
      el.currentTime = 0;
      el.play();
      return;
    }
    // If "all" repeat, loop back from end of list
    if (repeat === "all" && currentIndex >= playlist.length - 1) {
      onTrackSelect(0);
      return;
    }
    onNext();
  }, [repeat, currentIndex, playlist.length, onNext, onTrackSelect]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsLoading(false));
    }
  }, [isPlaying]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  // Seek functionality
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  // Skip ±10s
  const skipBy = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (!el) return;
      const next = Math.min(
        Math.max(0, (el.currentTime || 0) + delta),
        duration || 0
      );
      el.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  // Volume control
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    },
    []
  );

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const cycleRate = useCallback(() => {
    setRate((r) => {
      const steps = [0.75, 1, 1.25, 1.5, 2];
      const idx = steps.indexOf(r);
      return steps[(idx + 1) % steps.length];
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) =>
      prev === "off" ? "one" : prev === "one" ? "all" : "off"
    );
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentTrack) return;
      if (
        e.target &&
        (e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        isPlaying ? onPause() : onPlay();
      } else if (e.code === "ArrowRight") {
        skipBy(10);
      } else if (e.code === "ArrowLeft") {
        skipBy(-10);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume((v) => Math.min(1, v + 0.05));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume((v) => Math.max(0, v - 0.05));
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTrack, isPlaying, onPause, onPlay, skipBy, toggleMute]);

  return {
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
  };
}