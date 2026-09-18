// Find where a moment in time lives in a Laravel log without reading the file.
// Entries start with a sorted timestamp, so a handful of small probes at
// bisected byte offsets locate any time in a file of any size.

import { dateTimestampRegex } from "./logParser";
import { SeekProbeBytes } from "./search";

/**
 * Clock millis of a timestamp as written, ignoring any offset. This is the
 * axis the log itself is sorted on, so it is the one to bisect on.
 */
export function writtenClockMillis(timestamp: string): number | null {
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (!match) return null;
  const millis = Date.parse(`${match[1]}T${match[2]}Z`);
  return Number.isFinite(millis) ? millis : null;
}

/**
 * The first entry header that starts on a line boundary inside a probe. Bytes
 * before the first newline belong to a line we joined mid-way and are skipped,
 * unless the probe is at offset 0 where the file itself starts a line.
 */
export function firstHeaderIn(chunk: string, atFileStart: boolean): { millis: number; indexInChunk: number } | null {
  let index = atFileStart ? 0 : chunk.indexOf("\n") + 1;
  if (!atFileStart && index === 0) return null; // no newline at all: the probe is inside one enormous line
  while (index < chunk.length) {
    const end = chunk.indexOf("\n", index);
    const line = chunk.slice(index, end === -1 ? undefined : end);
    const stamp = line.match(dateTimestampRegex);
    if (stamp) {
      const millis = writtenClockMillis(stamp[1]);
      if (millis !== null) return { millis, indexInChunk: index };
    }
    if (end === -1) break;
    index = end + 1;
  }
  return null;
}

/** A probe that finds no header grows by this factor, up to SeekProbeMaxBytes, before giving up. */
const SeekProbeGrowth = 4;
export const SeekProbeMaxBytes = 512 * 1024;

/**
 * Byte offset of the first entry at or after `targetMillis`, or `fileSize` if
 * every entry is earlier. `probe(offset, length)` returns up to `length` bytes
 * of text from that offset. About log2(fileSize / probe size) probes: 20 for 3 GB.
 *
 * A probe can land inside a stack trace and see no timestamp at all. Guessing
 * a direction there would send the bisection the wrong way half the time, so
 * the probe grows until it reaches the next header. Only a run of headerless
 * text longer than SeekProbeMaxBytes is treated as "earlier", the safe side:
 * the caller reads a window forward from the result.
 */
export async function bisectOffsetForTime(
  fileSize: number,
  targetMillis: number,
  probe: (offset: number, length: number) => Promise<string>
): Promise<number> {
  let low = 0;
  let high = fileSize;
  let best = fileSize;

  async function headerAt(offset: number) {
    let length = SeekProbeBytes;
    for (;;) {
      const chunk = await probe(offset, length);
      const header = firstHeaderIn(chunk, offset === 0);
      if (header) return { chunk, header };
      if (length >= SeekProbeMaxBytes || offset + length >= fileSize) return { chunk, header: null };
      length = Math.min(SeekProbeMaxBytes, length * SeekProbeGrowth);
    }
  }

  // Each probe halves the range; bail once the range is smaller than a probe.
  while (high - low > SeekProbeBytes) {
    const mid = low + Math.floor((high - low) / 2);
    const { chunk, header } = await headerAt(mid);
    if (header === null) {
      low = mid;
      continue;
    }
    if (header.millis >= targetMillis) {
      best = mid + byteLength(chunk.slice(0, header.indexInChunk));
      high = mid;
    } else {
      low = mid;
    }
  }
  // Final linear pass over the last probe-sized range to land on an exact header.
  const chunk = await probe(low, SeekProbeBytes);
  let index = low === 0 ? 0 : chunk.indexOf("\n") + 1;
  if (low === 0 || index > 0) {
    while (index < chunk.length) {
      const end = chunk.indexOf("\n", index);
      const line = chunk.slice(index, end === -1 ? undefined : end);
      const stamp = line.match(dateTimestampRegex);
      if (stamp) {
        const millis = writtenClockMillis(stamp[1]);
        if (millis !== null && millis >= targetMillis) return low + byteLength(chunk.slice(0, index));
      }
      if (end === -1) break;
      index = end + 1;
    }
  }
  return best;
}

function byteLength(text: string): number {
  return typeof Buffer !== "undefined" ? Buffer.byteLength(text, "utf8") : new TextEncoder().encode(text).length;
}
