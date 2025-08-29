import { useMemo, useCallback } from "react";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import { isAudioFile } from "@/lib/audio-utils";
import type { FileItem } from "./useFileData";

interface UseAudioOperationsProps {
  filteredItems: FileItem[];
  selectedItems: Set<string>;
  currentPath: string;
}

export function useAudioOperations({
  filteredItems,
  selectedItems,
  currentPath,
}: UseAudioOperationsProps) {
  const { playTrack, playFromSelection, playFolder } = useMusicPlayer();

  const audioFiles = useMemo(
    () => filteredItems.filter(isAudioFile),
    [filteredItems]
  );

  const selectedAudioFiles = useMemo(
    () => Array.from(selectedItems)
      .map((name) => filteredItems.find((item) => item.name === name))
      .filter((item): item is FileItem => item !== undefined && isAudioFile(item)),
    [selectedItems, filteredItems]
  );

  const handlePlayAllAudio = useCallback(() => {
    if (audioFiles.length > 0) {
      playFolder(audioFiles, currentPath);
    }
  }, [audioFiles, currentPath, playFolder]);

  const handlePlaySelectedAudio = useCallback(() => {
    if (selectedAudioFiles.length > 0) {
      playFromSelection(selectedAudioFiles, currentPath);
    }
  }, [selectedAudioFiles, currentPath, playFromSelection]);

  const handleAudioPlay = useCallback(
    (item: FileItem) => {
      const audioTrack = {
        name: item.name.replace(/\.[^/.]+$/, ""),
        url: item.url || `${currentPath}/${item.name}`.replace(/\/+/g, "/"),
        path: `${currentPath}/${item.name}`.replace(/\/+/g, "/"),
        duration: undefined,
      };
      playTrack(audioTrack, filteredItems, currentPath);
    },
    [currentPath, filteredItems, playTrack]
  );

  return {
    audioFiles,
    selectedAudioFiles,
    handlePlayAllAudio,
    handlePlaySelectedAudio,
    handleAudioPlay,
  };
}