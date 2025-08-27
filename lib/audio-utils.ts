export interface FileItem {
  name: string;
  type: "file" | "dir";
  size?: number;
  mtime: number;
  url?: string | null;
}

export const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'aac', 'wma', 'opus'
] as const;

export type AudioExtension = typeof AUDIO_EXTENSIONS[number];

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isAudioFile(item: FileItem): boolean {
  if (item.type !== "file") return false;
  const extension = getFileExtension(item.name);
  return AUDIO_EXTENSIONS.includes(extension as AudioExtension);
}

export function filterAudioFiles(items: FileItem[]): FileItem[] {
  return items.filter(isAudioFile);
}

export function getAudioMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wma: 'audio/x-ms-wma',
    opus: 'audio/opus'
  };
  return mimeTypes[extension.toLowerCase()] || 'audio/*';
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}