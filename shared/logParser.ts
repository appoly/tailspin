// The Laravel log parser, shared by the renderer (via the `$` alias) and the
// main process (for the MCP server). Pure TypeScript: no Vue, no Node.

import type { LogEntry } from "./interfaces";

export const LogStatuses = Object.freeze([
  "debug", "info", "notice", "warning", "error",
  "critical", "alert", "emergency", "processing", "processed", "failed",
]);

export const dateTimestampRegex = /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})\.?(\d{6})?([\+\-]\d\d:\d\d)?\]/;
const environmentRegex = /(.*?(\w+)\.|.*?)/;
const severityRegex = "(" + LogStatuses.join("|") + ")?: ";
const logTextRegex = /(.*?)$/;

const logParsingRegex = new RegExp(
  dateTimestampRegex.source + environmentRegex.source + severityRegex + logTextRegex.source,
  "i"
);

/**
 * Split raw log text into entries, newest first. Lines before the first
 * timestamp are a partial entry cut off by the byte budget and are dropped.
 */
export function parseLogEntries(logData: string): LogEntry[] {
  const lines = logData.split(/[\r\n]+/).filter((line) => line.trim() !== "");
  const parsedEntries: LogEntry[] = [];
  let entryIndex = 0;

  for (const entry of lines) {
    if (entryIndex === 0 && !entry.match(dateTimestampRegex)) continue;

    // Keep the offset on the timestamp when Laravel wrote one: without it
    // there is no way to re-base the entry onto the reader's own clock.
    const stamp = entry.match(dateTimestampRegex);
    const timestamp = stamp ? stamp[1] + (stamp[3] ?? "") : null;

    if (timestamp) {
      const matches = entry.match(logParsingRegex);
      parsedEntries[entryIndex] = {
        timestamp,
        environment: matches?.[5] ?? "unknown",
        severity: matches?.[6] ?? "unknown",
        text: matches?.[7] ?? "",
      };
      entryIndex++;
    } else {
      parsedEntries[entryIndex - 1].text += "\n" + entry;
    }
  }

  return parsedEntries.reverse();
}
