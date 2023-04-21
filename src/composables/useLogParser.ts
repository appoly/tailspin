import { LogStatuses } from "@/constants/LogStatuses";
import { LogEntry } from "@/interfaces";
import { unref } from "vue";

// Match on the date, optionally with a space or T, and the time, and optionally the microseconds and timezone offset.
//  ie. [2021-01-01 00:00:00.000000+00:00] or a simple match [2021-01-01 00:00:00]
const dateTimestampRegex = /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})\.?(\d{6})?([\+\-]\d\d:\d\d)?\]/;
// Match on the environment and the severity, ie. local.INFO:
const environmentRegex = /(.*?(\\w+)\\.|.*?)/;
// The severities and the colon, done as a group ie: /(INFO|DEBUG|ERROR|WARNING):/
const severityRegex = "(" + LogStatuses.join("|") + ")?: ";
// The log text, ie: "This is the log text"
const logTextRegex = /(.*?)$/;

/**
 * This pattern, used for processing Laravel logs, returns these results:
 * $matches[0] - the full log line being tested.
 * $matches[1] - full timestamp between the square brackets (includes microseconds and timezone offset)
 * $matches[2] - timestamp microseconds, if available
 * $matches[3] - timestamp timezone offset, if available
 * $matches[4] - contents between timestamp and the severity level
 * $matches[5] - environment (local, production, etc)
 * $matches[6] - log severity (info, debug, error, etc)
 * $matches[7] - the log text, the rest of the text.
 */
const logParsingRegex = new RegExp(
  dateTimestampRegex.source + environmentRegex.source + severityRegex + logTextRegex.source,
  "i"
);

export async function useLogParser(logData: string): Promise<LogEntry[]> {
  let logDataNew = unref(logData);
  return new Promise((resolve, reject) => {
    try {
      // First split by new lines. A lot of logs are on one line, but some are not.
      const logEntries = logDataNew.split(/[\r\n]+/).filter((line) => line.trim() !== "");
      const parsedEntries: LogEntry[] = [];

      let entryIndex = 0; // Track this outside of the loop - we have split by line, but below we are splitting by date (ie. by log).

      for (let i = 0; i < logEntries.length; i++) {
        const entry = logEntries[i];
        // Skip rows that don't start with a date when it is the first entry

        if (entryIndex === 0 && !entry.match(dateTimestampRegex)) {
          continue;
        }

        // If it matches the date regex, it is a new entry)
        let timestamp = entry.match(dateTimestampRegex)?.[1] ?? null;

        if (timestamp) {
          // If we have found a timestamp match, lets call the complicated variable match
          let matches = entry.match(logParsingRegex);

          parsedEntries[entryIndex] = {
            timestamp,
            environment: matches?.[5] ?? "unknown",
            severity: matches?.[6] ?? "unknown",
            text: matches?.[7] ?? "",
          };
          entryIndex++;
        } else {
          // Otherwise, it is part of the message, so add it to the message of the previous entry
          parsedEntries[entryIndex - 1].text += "\n" + entry;
        }
      }

      resolve(parsedEntries.reverse());
    } catch (error: any) {
      reject(error?.message ?? "An Error has Occurred");
    }
  });
}
