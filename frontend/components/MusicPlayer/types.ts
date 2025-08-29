export interface AudioTrack {
  name: string;
  url: string;
  path: string;
  duration?: number;
}

export interface MusicPlayerProps {
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

export type RepeatMode = "off" | "one" | "all";

export interface TrackInfoProps {
  currentTrack: AudioTrack;
  currentIndex: number;
  playlistLength: number;
  isPlaying: boolean;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export interface TransportControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentIndex: number;
  playlistLength: number;
  repeat: RepeatMode;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkipBy: (delta: number) => void;
}

export interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  rate: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
  onCycleRate: () => void;
}

export interface PlayerActionsProps {
  shuffled: boolean;
  repeat: RepeatMode;
  onShuffle: () => void;
  onCycleRepeat: () => void;
  onTogglePlaylist: () => void;
  onClose: () => void;
}

export interface PlaylistViewProps {
  playlist: AudioTrack[];
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  onTrackSelect: (index: number) => void;
}