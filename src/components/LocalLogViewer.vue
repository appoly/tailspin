<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span id="logViewerHeader" class="text-xs text-muted-foreground font-mono truncate">{{ headerPath }}</span>
        <span v-if="isUpdating" class="text-xs text-blue-400 animate-pulse shrink-0">Updating...</span>
      </div>
      <div class="flex items-center gap-1.5">
        <Button v-if="isDirectory" variant="outline" size="sm" class="h-7 text-xs" @click="openFolder">
          <FolderOpen class="h-3 w-3 mr-1" />
          Open Folder
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="refresh" :disabled="isLoading">
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Auto-fetch controls. A rotated file is finished being written to, so
         polling it would only cost stats. -->
    <div v-if="!isRotatedSelection" class="flex items-center gap-2 mb-3">
      <span class="text-xs text-muted-foreground">Auto-fetch:</span>
      <Button
        v-for="interval in autoFetchIntervals"
        :key="interval.value"
        variant="outline"
        size="sm"
        class="h-6 text-[10px] px-2"
        :class="{ 'bg-primary text-primary-foreground': autoFetchSeconds === interval.value }"
        @click="setAutoFetch(interval.value)"
      >
        {{ interval.label }}
      </Button>
      <Button v-if="autoFetchSeconds" variant="ghost" size="sm" class="h-6 text-[10px] px-2" @click="stopAutoFetch">
        Stop
      </Button>
      <span v-if="autoFetchSeconds && countdown > 0" class="text-xs text-muted-foreground">
        Next in {{ countdown }}s
      </span>
    </div>
    <div v-else class="text-xs text-muted-foreground mb-3">Rotated file, won't change</div>

    <LogFileBrowser
      v-if="isDirectory"
      :files="logFiles"
      :selected="selectedFile"
      @select="selectFile"
    />

    <LogViewer
      :logEntries="logEntries"
      :isLoading="isLoading"
      :errorMsg="errorMsg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Connection, LogEntry, LogFile } from '@/types/interfaces'
import { FileAPI } from '@/lib/backend'
import { useLogParser } from '@/composables/useLogParser'
import { useAutoFetch, DefaultAutoFetchIntervals } from '@/composables/useAutoFetch'
import { basename, isRotatedLogName } from '@/helpers'
import LogViewer from './LogViewer.vue'
import LogFileBrowser from './LogFileBrowser.vue'
import { Button } from '@/components/ui/button'
import { FolderOpen, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ connection: Connection }>()

const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const errorMsg = ref('')
const isDirectory = ref(false)
const hasProbedPath = ref(false)
const logFiles = ref<LogFile[]>([])
const selectedFile = ref('')
const lastReadBytes = ref(0)

const {
  autoFetchSeconds,
  countdown,
  intervals: autoFetchIntervals,
  setAutoFetch,
  stopAutoFetch,
} = useAutoFetch({
  connection: () => props.connection,
  fetchUpdates,
  // A local file costs a stat rather than an SSH handshake, so polling it
  // faster than the remote minimum is reasonable.
  intervals: [{ label: '10s', value: 10 }, ...DefaultAutoFetchIntervals],
})

const currentPath = computed(() => (isDirectory.value ? selectedFile.value : props.connection.path))

const isRotatedSelection = computed(() => {
  if (!hasProbedPath.value) return false
  const path = currentPath.value
  return !!path && isRotatedLogName(basename(path))
})

const headerPath = computed(() => {
  if (!isDirectory.value || !selectedFile.value) return props.connection.path
  return `${props.connection.path} · ${basename(selectedFile.value)}`
})

onMounted(refresh)

/** Re-read the directory listing (if any) and then whatever is selected. */
async function refresh() {
  isLoading.value = true
  errorMsg.value = ''

  try {
    isDirectory.value = (await FileAPI.IsFileOrDirectory(props.connection.path)) === 'directory'
    hasProbedPath.value = true

    if (isDirectory.value) {
      logFiles.value = await FileAPI.GetLogFilesInDirectory(props.connection.path)
      // Newest file by default, and again if whatever was open has rotated away.
      if (!logFiles.value.some(file => file.path === selectedFile.value)) {
        selectedFile.value = logFiles.value[0]?.path ?? ''
      }
    }

    await loadSelected()
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}

async function loadSelected() {
  const filePath = currentPath.value
  if (!filePath) {
    logEntries.value = []
    return
  }

  const res = await FileAPI.ReadLogFile(filePath)
  if (!res.success) {
    errorMsg.value = res.message || 'Failed to read file'
    logEntries.value = []
    return
  }

  // Where the next incremental read starts. The whole file was just parsed, even
  // when only its tail was read, so the end of it is the honest offset.
  lastReadBytes.value = res.fileSize
  logEntries.value = await useLogParser(res.content)
}

async function selectFile(file: LogFile) {
  if (file.path === selectedFile.value) return

  selectedFile.value = file.path
  // Nothing more is ever appended to a rotated file, so stop polling it.
  if (isRotatedSelection.value) {
    stopAutoFetch()
  }

  isLoading.value = true
  errorMsg.value = ''
  lastReadBytes.value = 0
  try {
    await loadSelected()
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}

/**
 * Read whatever has been appended since the last read. The offset read reports
 * the file's current size, so a truncation or rotation shows up as a size below
 * the offset and is handled with a full re-read rather than a bogus append.
 */
async function fetchUpdates(): Promise<LogEntry[]> {
  if (isUpdating.value || isLoading.value) return []

  const filePath = currentPath.value
  if (!filePath) return []

  isUpdating.value = true
  try {
    const res = await FileAPI.ReadLogFileFromOffset(filePath, lastReadBytes.value)
    if (!res.success) return []

    if (res.fileSize < lastReadBytes.value) {
      await loadSelected()
      return []
    }

    lastReadBytes.value = res.fileSize
    if (!res.content) return []

    const newEntries = await useLogParser(res.content)
    if (newEntries.length) {
      logEntries.value = [...newEntries, ...logEntries.value]
    }
    return newEntries
  } catch {
    // Silently fail on auto-fetch
    return []
  } finally {
    isUpdating.value = false
  }
}

async function openFolder() {
  await FileAPI.OpenFolderFromPath(props.connection.path)
}
</script>
