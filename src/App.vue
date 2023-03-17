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
      <input type="text" class="form-control" placeholder="Filter by level, time or message" v-model="searchTerm"
        :disabled="isLoading" />
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

    <template v-if="isLoading">
      <div v-for="row in 25" class="log-item p-2 my-2 cursor-none">
        <div class="log-item-severity placeholder-glow">
          <span class="col-9 placeholder rounded"
            :class="'bg-' + selectRandomFromArray(['primary', 'warning', 'danger', 'secondary'])"></span>
        </div>
        <div class="log-item-time placeholder-glow">
          <span class="col-10 placeholder rounded"></span>
        </div>
        <div class="log-item-text placeholder-glow">
          <span class="col-12 placeholder rounded"></span>
        </div>
      </div>
    </template>
    <template v-else>
      <div>
        <TheLogEntry v-for="logItem in filteredLogItems" :logItem="logItem" />
      </div>

      <!-- pagination -->
      <div class="my-5" v-if="totalItems">

        <div class="row justify-content-center">
          <div class="col-8 text-center align-content-center">
            <nav id="pagination">
              <ul class="pagination">
                <!-- pagination buttons -->
                <li class="page-item">
                  <a href="#" class="page-link" @click="changePage('previous')" :disabled="page === 1">
                    Previous
                  </a>
                </li>
                <!-- paginationLinks -->
                <li class="page-item" v-for="pageNumber in paginationLinks" :class="{ 'active': pageNumber === page }">
                  <a href="#" class="page-link" @click="page = pageNumber">
                    {{ pageNumber }}
                  </a>
                </li>

                <!-- next -->
                <li class="page-item">
                  <a href="#" class="page-link" @click="changePage('next')" :disabled="page === totalPages">
                    Next
                  </a>
                </li>
              </ul>
            </nav>
            Showing {{ (page - 1) * itemsPerPage + 1 }} - {{ page * itemsPerPage }} of {{ totalItems }}
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { computed, ref, onMounted } from "vue";
import { LogStatuses } from "./constants/LogStatuses"
import TheLogEntry from "./components/TheLogEntry.vue"
import { LogEntry } from "./interfaces";
import { selectRandomFromArray } from "./helpers";

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

const page = ref(1);
const itemsPerPage = 20;
const totalItems = computed(() => logEntries.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));
const hasPreviousPage = computed(() => page.value > 1);
const hasNextPage = computed(() => page.value < totalPages.value);
const paginationLinks = computed(() => {
  // two pages before and after the current page but not beyond the start or end
  const start = Math.max(1, page.value - 2);
  const end = Math.min(totalPages.value, page.value + 2);
  const links = [];
  for (let i = start; i <= end; i++) {
    links.push(i);
  }
  return links;
});


// computed filteredLogItems
const filteredLogItems = computed(() => {
  const search = searchTerm.value.toLowerCase();
  let items = logEntries.value

  if (search.length > 0) {
    items = logEntries.value.filter((logItem) => {
      return (
        logItem.text.toLowerCase().includes(search) ||
        logItem.severity.toLowerCase().includes(search) ||
        logItem.timestamp.includes(search)
      );
    })
  }

  return items.slice((page.value - 1) * itemsPerPage, page.value * itemsPerPage);
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

function changePage(type: string) {
  if (type === 'next' && hasNextPage.value) {
    page.value++;
  } else if (type === 'previous' && hasPreviousPage.value) {
    page.value--;
  }
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
#pagination {
  // center pagination
  display: flex;
  justify-content: center;
  align-items: center;

}
</style>
