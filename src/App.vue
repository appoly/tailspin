<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">Log Viewer</a>
    </div>
  </nav>

  <div class="container-fluid my-4">
    <div class="input-group mb-3">
      <input id="logFile" type="file" class="form-control" @change="handleFileSelect" />
    </div>
  </div>

  <div class="container-fluid">
    <!-- Search Bar -->
    <div class="input-group mb-3">
      <input type="text" class="form-control" placeholder="Filter by level, time or message" v-model="searchTerm" />
    </div>
    <div class="d-flex">
      <div class="log-item-severity">
        Severity
      </div>
      <div class="log-item-time">
        Time
      </div>
      <div class="log-item-text">
        Content
      </div>
    </div>

    <InfiniteList :data="filteredLogItems" :width="'100%'" :height="1500" :itemSize="40" v-slot="{ item, index }">
      <TheLogEntry :logItem="item" />
    </InfiniteList>
  </div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { computed, ref, onMounted } from "vue";
import { LogStatuses } from "./constants/LogStatuses"
import TheLogEntry from "./components/TheLogEntry.vue"
import { LogEntry } from "./interfaces";
import InfiniteList from 'vue3-infinite-list';

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
const searchTerm = ref('');
const isLoading = ref(false);

// computed filteredLogItems
const filteredLogItems = computed(() => {

  // each item is 20px high, so we can calculate the number of items to show

  const search = searchTerm.value.toLowerCase();
  let items = logEntries.value

  if (search.length > 0) {
    console.log('searching', search);
    items = logEntries.value.filter((logItem) => {
      return (
        logItem.text.toLowerCase().includes(search) ||
        logItem.severity.toLowerCase().includes(search) ||
        logItem.timestamp.includes(search)
      );
    })
  }
  return items
});


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

<style lang="scss" scoped>
.log-entry-container {
  max-height: 100vh;
  overflow-y: auto;
}
</style>
