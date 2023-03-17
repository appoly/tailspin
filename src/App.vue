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

  <div v-if="isLoading">
    Loading...
  </div>
  <div style="padding: 2rem" v-else>
    <div style="margin-bottom:0.5rem; padding:2rem; background-color:aquamarine; border-radius: 0.5rem;"
      v-for="(entry, index) in logEntries.slice(0, 100)" :key="index">
      <div>{{ entry.timestamp }}</div>
      <div>{{ entry.environment }}</div>
      <div>{{ entry.severity }}</div>
      <span v-html="entry.text"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { ref } from "vue";
import { LogStatuses } from "./constants/LogStatuses"

interface LogEntry {
  timestamp: string;
  severity: string;
  environment: string;
  text: string;
}

const dateTimestampRegex = new RegExp(/^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/);
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

const logEntries = ref<LogEntry[]>([]);
const isLoading = ref(false);


async function handleFileSelect(evt: any) {
  const files = evt.target.files; // FileList object
  const file = files[0];
  const filePath = file.path;

  isLoading.value = true;

  const fileContent = await content(filePath);
  logEntries.value = await parseLogEntries(fileContent);
  isLoading.value = false;
}

async function content(path: string): Promise<string> {
  return await readFile(path, "utf8");
}

/**
 * Parse log entries from log file
 * @param logData
 */
async function parseLogEntries(logData: string): Promise<LogEntry[]> {
  return new Promise((resolve, reject) => {
    // First split by new lines. A lot of logs are on one line, but some are not. This is much more efficient than splitting by the date.
    const logEntries = logData.split("\n").filter(line => line.trim() !== '');
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
          environment: matches?.[5] ?? 'unknown',
          severity: matches?.[6] ?? 'unknown',
          text: matches?.[7] ?? '',
        };
        entryIndex++;
      } else {
        // Otherwise, it is part of the message, so add it to the message of the previous entry
        parsedEntries[entryIndex - 1].text += "\n" + entry;
      }

    }

    resolve(parsedEntries);
  });
}


</script>

<style lang="scss" scoped></style>
