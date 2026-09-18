import type SSH2Promise from "ssh2-promise";
import { statSync } from "node:fs";
import type { LogEntry, SshDetailsToIpc } from "../../../shared/interfaces";
import { parseLogEntries } from "../../../shared/logParser";
import { bisectOffsetForTime } from "../../../shared/logSeek";
import {
  SearchDefaultLimit,
  SearchMaxLimit,
  SearchMinIntervalMs,
  searchSizeLimitMessage,
  validatePattern,
  type SearchOutcome,
  type WindowRead,
} from "../../../shared/search";
import { expandHome } from "../helpers";
import { readLocalRange, searchLocalFile } from "./local-logs";
import { isCompressedPath, readRange, searchRemote, statFile, withSsh } from "./ssh";

// Whole-file search and time seeking, for both the UI and the MCP tools. The
// heavy lifting (grep, tac, gzip) happens in services/ssh.ts and
// services/local-logs.ts; this module owns the rules: what may be searched,
// how often, and how the raw output becomes entries.

// ---------------------------------------------------------------------------
// Rate limit. One key per file so a human and an agent hitting the same prod
// box share the same budget.

const lastSearchAt = new Map<string, number>();

/** 0 when a search may run now (and records it), otherwise the wait in ms. */
export function searchGate(key: string): number {
  const now = Date.now();
  const last = lastSearchAt.get(key) ?? 0;
  const wait = last + SearchMinIntervalMs - now;
  if (wait > 0) return wait;
  lastSearchAt.set(key, now);
  return 0;
}

export function clampSearchLimit(value: unknown): number {
  const requested = Math.floor(Number(value));
  if (!Number.isFinite(requested) || requested <= 0) return SearchDefaultLimit;
  return Math.min(requested, SearchMaxLimit);
}

// ---------------------------------------------------------------------------
// Output handling

/** Everything the line-level match saw, so a hit in the header still counts. */
export function entryMatches(entry: LogEntry, needle: string): boolean {
  const haystack = `${entry.timestamp} ${entry.environment}.${entry.severity}: ${entry.text}`.toLowerCase();
  return haystack.includes(needle);
}

/**
 * grep prints context groups separated by "--". Parse each group on its own so
 * a partial entry at a group edge never glues onto its neighbour, keep only
 * entries that actually contain the pattern, and return them newest first.
 * `reversed` means the text came out of `tac` and runs newest to oldest.
 */
export function entriesFromSearchOutput(raw: string, pattern: string, reversed: boolean): LogEntry[] {
  let lines = raw.split(/\r?\n/);
  if (reversed) lines = lines.reverse();
  const blocks = lines.join("\n").split(/\n--\n|^--\n|\n--$/);
  const needle = pattern.toLowerCase();
  const seen = new Set<string>();
  const result: LogEntry[] = [];
  // Blocks are in file order (oldest first); newest block first in the result.
  for (let i = blocks.length - 1; i >= 0; i--) {
    for (const entry of parseLogEntries(blocks[i])) {
      if (!entryMatches(entry, needle)) continue;
      const key = `${entry.timestamp}|${entry.text.slice(0, 200)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(entry);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Search

export async function runRemoteSearch(
  options: SshDetailsToIpc,
  encrypted: boolean,
  path: string,
  rawPattern: unknown,
  rawLimit: unknown
): Promise<SearchOutcome> {
  const checked = validatePattern(rawPattern);
  if (!checked.ok) return refused(checked.message);
  const limit = clampSearchLimit(rawLimit);
  const compressed = isCompressedPath(path);

  const result = await withSsh(
    async (ssh: SSH2Promise) => {
      const { size } = await statFile(ssh, path);
      const tooBig = searchSizeLimitMessage(size, compressed);
      if (tooBig) return { success: false as const, message: tooBig };

      const wait = searchGate(`${options.host}|${path}`);
      if (wait > 0) return { success: false as const, message: waitMessage(wait), retryInMs: wait };

      const started = Date.now();
      const { raw, timedOut, reversed, capped } = await searchRemote(ssh, path, checked.pattern, limit, compressed);
      const entries = entriesFromSearchOutput(raw, checked.pattern, reversed);
      return {
        success: true as const,
        entries: entries.slice(0, limit),
        scanned: timedOut || capped || entries.length > limit || (reversed && entries.length >= limit) ? ("partial" as const) : ("whole" as const),
        durationMs: Date.now() - started,
        timedOut,
      };
    },
    options,
    encrypted
  );

  if (!result.success) return refused(result.message ?? "Search failed.", (result as any).retryInMs);
  return result as SearchOutcome;
}

export async function runLocalSearch(rawPath: string, rawPattern: unknown, rawLimit: unknown): Promise<SearchOutcome> {
  const checked = validatePattern(rawPattern);
  if (!checked.ok) return refused(checked.message);
  const limit = clampSearchLimit(rawLimit);
  const path = expandHome(rawPath);
  const compressed = isCompressedPath(path);

  let size: number;
  try {
    size = statSync(path).size;
  } catch (err: any) {
    return refused(err?.message ?? "Could not read the file.");
  }
  const tooBig = searchSizeLimitMessage(size, compressed);
  if (tooBig) return refused(tooBig);

  const wait = searchGate(`local|${path}`);
  if (wait > 0) return refused(waitMessage(wait), wait);

  const started = Date.now();
  try {
    const { raw, timedOut, truncated } = await searchLocalFile(path, checked.pattern, limit);
    const entries = entriesFromSearchOutput(raw, checked.pattern, false);
    return {
      success: true,
      entries: entries.slice(0, limit),
      scanned: timedOut || truncated || entries.length > limit ? "partial" : "whole",
      durationMs: Date.now() - started,
      timedOut,
    };
  } catch (err: any) {
    return refused(err?.message ?? "Search failed.");
  }
}

function waitMessage(wait: number): string {
  return `Searched this file a moment ago. Next search in ${Math.ceil(wait / 1000)}s.`;
}

function refused(message: string, retryInMs?: number): SearchOutcome {
  return { success: false, message, entries: [], scanned: "whole", durationMs: 0, timedOut: false, ...(retryInMs ? { retryInMs } : {}) };
}

// ---------------------------------------------------------------------------
// Windows: a slice of the file around a time, or at an explicit offset.

export interface WindowTarget {
  /** Clock millis, as written in the log, to centre the window on. */
  targetMs?: number;
  /** Or an explicit start offset (Earlier / Later paging). */
  offset?: number;
}

async function windowFrom(
  fileSize: number,
  target: WindowTarget,
  bytes: number,
  probe: (offset: number, length: number) => Promise<string>,
  range: (offset: number, length: number) => Promise<string>
): Promise<WindowRead> {
  const length = Math.max(1, Math.floor(bytes));
  let offset: number;
  if (typeof target.offset === "number" && Number.isFinite(target.offset)) {
    offset = Math.max(0, Math.floor(target.offset));
  } else if (typeof target.targetMs === "number" && Number.isFinite(target.targetMs)) {
    const at = await bisectOffsetForTime(fileSize, target.targetMs, probe);
    offset = Math.max(0, at - Math.floor(length / 2));
  } else {
    return { success: false, message: "A time or an offset is required.", content: "", offset: 0, fileSize, atStart: false, atEnd: false };
  }
  if (offset >= fileSize) offset = Math.max(0, fileSize - length);
  let content = await range(offset, length);
  const atEnd = offset + Buffer.byteLength(content, "utf8") >= fileSize;
  // A window that stops mid-line would parse its last line as a headless entry;
  // the parser already drops the partial first line, so drop the last one too.
  if (!atEnd) {
    const cut = content.lastIndexOf("\n");
    if (cut > 0) content = content.slice(0, cut + 1);
  }
  return { success: true, content, offset, fileSize, atStart: offset === 0, atEnd };
}

export async function remoteWindow(
  options: SshDetailsToIpc,
  encrypted: boolean,
  path: string,
  target: WindowTarget,
  bytes: number
): Promise<WindowRead> {
  if (isCompressedPath(path)) {
    return { success: false, message: "Compressed files cannot be seeked. Download it or read its tail.", content: "", offset: 0, fileSize: 0, atStart: false, atEnd: false };
  }
  const result = await withSsh(
    async (ssh: SSH2Promise) => {
      const { size } = await statFile(ssh, path);
      const window = await windowFrom(
        size,
        target,
        bytes,
        (offset, length) => readRange(ssh, path, offset, length),
        (offset, length) => readRange(ssh, path, offset, length)
      );
      return { success: window.success, message: window.message, window };
    },
    options,
    encrypted
  );
  if (!result.success || !("window" in result)) {
    return { success: false, message: result.message ?? "Could not read the file.", content: "", offset: 0, fileSize: 0, atStart: false, atEnd: false };
  }
  return result.window;
}

export async function localWindow(rawPath: string, target: WindowTarget, bytes: number): Promise<WindowRead> {
  const path = expandHome(rawPath);
  if (isCompressedPath(path)) {
    return { success: false, message: "Compressed files cannot be seeked.", content: "", offset: 0, fileSize: 0, atStart: false, atEnd: false };
  }
  try {
    const { size } = statSync(path);
    return await windowFrom(
      size,
      target,
      bytes,
      (offset, length) => readLocalRange(path, offset, length),
      (offset, length) => readLocalRange(path, offset, length)
    );
  } catch (err: any) {
    return { success: false, message: err?.message ?? "Could not read the file.", content: "", offset: 0, fileSize: 0, atStart: false, atEnd: false };
  }
}
