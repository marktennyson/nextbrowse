"use client";
import { FileManager } from "@/components/homepage";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import MusicPlayer from "@/components/MusicPlayer";

export default function AppWithMusicPlayer() {
  const { 
    currentTrack, 
    playlist, 
    isPlaying, 
    shuffled, 
    isPlayerVisible,
    togglePlayPause,
    nextTrack,
    previousTrack,
    selectTrack,
    closePlayer,
    toggleShuffle
  } = useMusicPlayer();

  return (
    <>
      <FileManager />
      {isPlayerVisible && (
        <MusicPlayer
          currentTrack={currentTrack}
          playlist={playlist}
          isPlaying={isPlaying}
          shuffled={shuffled}
          onPlay={togglePlayPause}
          onPause={togglePlayPause}
          onNext={nextTrack}
          onPrevious={previousTrack}
          onTrackSelect={selectTrack}
          onClose={closePlayer}
          onShuffle={toggleShuffle}
        />
      )}
    </>
  );
}