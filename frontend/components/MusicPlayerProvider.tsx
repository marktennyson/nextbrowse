"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AudioTrack } from "./MusicPlayer";
import { FileItem, filterAudioFiles, shuffleArray } from "@/lib/audio-utils";

interface MusicPlayerContextType {
  currentTrack: AudioTrack | null;
  playlist: AudioTrack[];
  originalPlaylist: AudioTrack[];
  isPlaying: boolean;
  shuffled: boolean;
  isPlayerVisible: boolean;
  playTrack: (track: AudioTrack, playlistItems?: FileItem[], currentPath?: string) => void;
  playFromSelection: (selectedFiles: FileItem[], currentPath: string) => void;
  playFolder: (folderItems: FileItem[], currentPath: string) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  selectTrack: (index: number) => void;
  closePlayer: () => void;
  toggleShuffle: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}

interface MusicPlayerProviderProps {
  children: React.ReactNode;
}

export default function MusicPlayerProvider({ children }: MusicPlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [originalPlaylist, setOriginalPlaylist] = useState<AudioTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // Helper function to convert FileItem to AudioTrack
  const fileItemToAudioTrack = useCallback((item: FileItem, basePath: string): AudioTrack => ({
    name: item.name.replace(/\.[^/.]+$/, ""), // Remove extension for display
    url: item.url || `${basePath}/${item.name}`.replace(/\/+/g, "/"),
    path: `${basePath}/${item.name}`.replace(/\/+/g, "/"),
    duration: undefined, // Will be set when audio loads
  }), []);

  // Play a specific track with optional playlist context
  const playTrack = useCallback((track: AudioTrack, playlistItems?: FileItem[], currentPath?: string) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsPlayerVisible(true);

    // If playlist items are provided, create a new playlist
    if (playlistItems && currentPath) {
      const audioFiles = filterAudioFiles(playlistItems);
      const newPlaylist = audioFiles.map(item => fileItemToAudioTrack(item, currentPath));
      setPlaylist(shuffled ? shuffleArray(newPlaylist) : newPlaylist);
      setOriginalPlaylist(newPlaylist);
    }
  }, [fileItemToAudioTrack, shuffled]);

  // Play from selected files
  const playFromSelection = useCallback((selectedFiles: FileItem[], currentPath: string) => {
    const audioFiles = filterAudioFiles(selectedFiles);
    if (audioFiles.length === 0) return;

    const newPlaylist = audioFiles.map(item => fileItemToAudioTrack(item, currentPath));
    const playlistToUse = shuffled ? shuffleArray(newPlaylist) : newPlaylist;
    
    setCurrentTrack(playlistToUse[0]);
    setPlaylist(playlistToUse);
    setOriginalPlaylist(newPlaylist);
    setIsPlaying(true);
    setIsPlayerVisible(true);
  }, [fileItemToAudioTrack, shuffled]);

  // Play all audio files in current folder
  const playFolder = useCallback((folderItems: FileItem[], currentPath: string) => {
    const audioFiles = filterAudioFiles(folderItems);
    if (audioFiles.length === 0) return;

    const newPlaylist = audioFiles.map(item => fileItemToAudioTrack(item, currentPath));
    const playlistToUse = shuffled ? shuffleArray(newPlaylist) : newPlaylist;
    
    setCurrentTrack(playlistToUse[0]);
    setPlaylist(playlistToUse);
    setOriginalPlaylist(newPlaylist);
    setIsPlaying(true);
    setIsPlayerVisible(true);
  }, [fileItemToAudioTrack, shuffled]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Next track
  const nextTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex(track => track.path === currentTrack.path);
    const nextIndex = currentIndex + 1;

    if (nextIndex < playlist.length) {
      setCurrentTrack(playlist[nextIndex]);
      setIsPlaying(true);
    } else {
      // End of playlist - stop playing
      setIsPlaying(false);
    }
  }, [currentTrack, playlist]);

  // Previous track
  const previousTrack = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex(track => track.path === currentTrack.path);
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      setCurrentTrack(playlist[prevIndex]);
      setIsPlaying(true);
    }
  }, [currentTrack, playlist]);

  // Select specific track from playlist
  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentTrack(playlist[index]);
      setIsPlaying(true);
    }
  }, [playlist]);

  // Close player
  const closePlayer = useCallback(() => {
    setIsPlayerVisible(false);
    setIsPlaying(false);
  }, []);

  // Toggle shuffle mode
  const toggleShuffle = useCallback(() => {
    const newShuffled = !shuffled;
    setShuffled(newShuffled);

    if (originalPlaylist.length > 0) {
      const currentTrackPath = currentTrack?.path;
      let newPlaylist: AudioTrack[];

      if (newShuffled) {
        // Shuffle the original playlist
        newPlaylist = shuffleArray(originalPlaylist);
      } else {
        // Use original order
        newPlaylist = [...originalPlaylist];
      }

      // Ensure current track is still at the right position
      if (currentTrackPath) {
        const currentTrackIndex = newPlaylist.findIndex(track => track.path === currentTrackPath);
        if (currentTrackIndex > 0) {
          // Move current track to the beginning of the shuffled list
          const currentTrackItem = newPlaylist[currentTrackIndex];
          newPlaylist.splice(currentTrackIndex, 1);
          newPlaylist.unshift(currentTrackItem);
        }
      }

      setPlaylist(newPlaylist);
    }
  }, [shuffled, originalPlaylist, currentTrack]);

  // Update playlist when shuffle mode changes
  useEffect(() => {
    if (originalPlaylist.length === 0) return;

    const currentTrackPath = currentTrack?.path;
    let newPlaylist: AudioTrack[];

    if (shuffled) {
      newPlaylist = shuffleArray(originalPlaylist);
    } else {
      newPlaylist = [...originalPlaylist];
    }

    // Maintain current track position
    if (currentTrackPath) {
      const currentTrackIndex = newPlaylist.findIndex(track => track.path === currentTrackPath);
      if (currentTrackIndex > 0) {
        const currentTrackItem = newPlaylist[currentTrackIndex];
        newPlaylist.splice(currentTrackIndex, 1);
        newPlaylist.unshift(currentTrackItem);
      }
    }

    setPlaylist(newPlaylist);
  }, [shuffled, originalPlaylist, currentTrack]);

  const value: MusicPlayerContextType = {
    currentTrack,
    playlist,
    originalPlaylist,
    isPlaying,
    shuffled,
    isPlayerVisible,
    playTrack,
    playFromSelection,
    playFolder,
    togglePlayPause: togglePlayPause,
    nextTrack,
    previousTrack,
    selectTrack,
    closePlayer,
    toggleShuffle,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}