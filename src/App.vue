<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">Log Viewer</a>
    </div>
  </nav>

  <div class="container-fluid my-4">
    <div class="input-group mb-3">
      <input ref="logFile" type="file" class="form-control" @change="handleFileSelect" />
    </div>
  </div>

  <div>
    <pre>{{ logEntries.slice(0, 250) ?? [] }}</pre>
  </div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { ref, onMounted } from "vue";
import { LogStatuses } from "./constants/LogStatuses"

interface LogEntry {
  timestamp: string;
  severity: string;
  level: string;
  text: string;
}

async function handleFileSelect(evt: any) {
  const files = evt.target.files; // FileList object
  const file = files[0];
  const filePath = file.path;

  const fileContent = await content(filePath);
  logEntries.value = parseLogEntries(fileContent);
}


const logEntries = ref<LogEntry[]>([]);

async function content(path: string): Promise<string> {
  return await readFile(path, "utf8");
}

const dateTimestampRegex = new RegExp(/^\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/);

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
const logParsingRegex =
  new RegExp(
    `^\\[(\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}\\.?(\\d{6}([\\+-]\\d\\d:\\d\\d)?)?)\\](.*?(\\w+)\\.|.*?)(` +
    LogStatuses.join('|') +
    `)?: (.*?)( in [\\/].*?:[0-9]+)?$`, 'i'
  );

/**
 * Parse log entries from log file
 * @param logData
 */
function parseLogEntries(logData: string) {
  // First split by new lines. A lot of logs are on one line, but some are not. This is much more efficient than splitting by the date.
  const logEntries = logData.split("\n").filter(line => line.trim() !== '');
  const parsedEntries: LogEntry[] = [];
  const entries: {
    timestamp: string;
    level: string;
    severity: string;
    text: string;
  }[] = [];
  let entryIndex = 0;

  const currentMessage: string[][] = [];

  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    // Skip rows that don't start with a date when it is the first entry

    if (entryIndex === 0 && !entry.match(dateTimestampRegex)) {
      continue;
    }

    // If it matches the date regex, it is a new entry)
    let timestamp = entry.match(dateTimestampRegex)?.[0] ?? null;

    if (timestamp) {
      // If we have found a timestamp match, lets call the complicated variable match
      let matches = entry.match(logParsingRegex);

      parsedEntries[entryIndex] = {
        timestamp,
        level: matches?.[5] ?? 'unknown',
        severity: matches?.[6] ?? 'unknown',
        text: matches?.[7] ?? '',
      };
      entryIndex++;
    } else {
      // Otherwise, it is part of the message, so add it to the message of the previous entry
      parsedEntries[entryIndex - 1].text += "\n" + entry;
    }

  }

  return parsedEntries;
}


</script>

<style lang="scss" scoped></style>
