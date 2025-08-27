import crypto from "crypto";

export type Share = {
  id: string;
  path: string;
  type: "file" | "dir";
  createdAt: number;
  expiresAt?: number;
  password?: string;
  allowUploads?: boolean;
  disableViewer?: boolean;
  quickDownload?: boolean;
  maxBandwidth?: number;
  title?: string;
  description?: string;
  theme?: string;
  viewMode?: "list" | "grid";
};

// In-memory storage for shares (replace with DB in production)
export const shares = new Map<string, Share>();

// helper to create a new share id
export function createShareId() {
  return crypto.randomUUID();
}
