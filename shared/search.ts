// Limits for whole-file search and time seeking. Shared by the main process
// (which enforces them), the renderer (which explains them) and the MCP tools.

/** Plain files larger than this are refused for search: the right tool for them is the box itself. */
export const SearchMaxPlainBytes = 1024 * 1024 * 1024;
/** Compressed files are decompressed in full to search, so the cap is on the compressed size. */
export const SearchMaxCompressedBytes = 200 * 1024 * 1024;
/** Hard wall-clock cap on a remote search, enforced by `timeout` on the server. */
export const SearchTimeoutSeconds = 15;
/** Lines kept either side of a matching line so the enclosing entry, stack trace included, survives. */
export const SearchContextLines = 120;
/** The most search output a single call may pull back, whatever matched. */
export const SearchOutputCapBytes = 4 * 1024 * 1024;
/** Minimum gap between two searches of the same connection, human or agent. */
export const SearchMinIntervalMs = 10_000;
export const SearchDefaultLimit = 20;
export const SearchMaxLimit = 100;
export const SearchPatternMaxLength = 200;
/** Bytes read per probe while bisecting a file for a timestamp. */
export const SeekProbeBytes = 4096;

export type SearchScan = "whole" | "partial";

export interface SearchOutcome {
  success: boolean;
  message?: string;
  /** Newest first. */
  entries: import("./interfaces").LogEntry[];
  /** "partial" when the search stopped after enough matches, so older ones may exist. */
  scanned: SearchScan;
  durationMs: number;
  timedOut: boolean;
  /** Set when the call was refused by the rate limit; how long until the next search is allowed. */
  retryInMs?: number;
}

export interface WindowRead {
  success: boolean;
  message?: string;
  content: string;
  /** Byte offset the window starts at. */
  offset: number;
  fileSize: number;
  atStart: boolean;
  atEnd: boolean;
}

/**
 * A search pattern is a fixed string, never a regex. It is passed to the shell
 * as one quoted argument, but the shell is not the only thing that has to cope
 * with it, so keep it to printable text of a sane length.
 */
export function validatePattern(raw: unknown): { ok: true; pattern: string } | { ok: false; message: string } {
  const pattern = String(raw ?? "").trim();
  if (!pattern) return { ok: false, message: "Enter something to search for." };
  if (pattern.length > SearchPatternMaxLength) {
    return { ok: false, message: `Search text is limited to ${SearchPatternMaxLength} characters.` };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(pattern)) return { ok: false, message: "Search text cannot contain control characters." };
  return { ok: true, pattern };
}

export function searchSizeLimitMessage(size: number, compressed: boolean): string | null {
  if (compressed && size > SearchMaxCompressedBytes) {
    return `Too large to search: ${formatSize(size)} compressed, limit ${formatSize(SearchMaxCompressedBytes)}.`;
  }
  if (!compressed && size > SearchMaxPlainBytes) {
    return `Too large to search: ${formatSize(size)}, limit ${formatSize(SearchMaxPlainBytes)}.`;
  }
  return null;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
