<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span id="logViewerHeader" class="text-xs text-muted-foreground font-mono truncate">{{ headerPath }}</span>
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

    <LogFileBrowser
      v-if="isDirectory"
      :files="logFiles"
      :selected="selectedFile"
      @select="selectFile"
    />

    <p v-if="isRotatedSelection" class="text-xs text-muted-foreground mb-3">Rotated file, won't change</p>

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
import { basename, isRotatedLogName } from '@/helpers'
import LogViewer from './LogViewer.vue'
import LogFileBrowser from './LogFileBrowser.vue'
import { Button } from '@/components/ui/button'
import { FolderOpen, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ connection: Connection }>()

const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const errorMsg = ref('')
const isDirectory = ref(false)
const hasProbedPath = ref(false)
const logFiles = ref<LogFile[]>([])
const selectedFile = ref('')

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

  logEntries.value = await useLogParser(res.content)
}

async function selectFile(file: LogFile) {
  if (file.path === selectedFile.value) return

  selectedFile.value = file.path
  isLoading.value = true
  errorMsg.value = ''
  try {
    await loadSelected()
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}

async function openFolder() {
  await FileAPI.OpenFolderFromPath(props.connection.path)
}
</script>
