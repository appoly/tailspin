<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h2 id="logViewerHeader" class="text-sm font-medium">{{ connection.name }}</h2>
        <span class="text-xs text-muted-foreground font-mono">{{ connection.path }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <Button v-if="isDirectory" variant="outline" size="sm" class="h-7 text-xs" @click="openFolder">
          <FolderOpen class="h-3 w-3 mr-1" />
          Open Folder
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="readLog" :disabled="isLoading">
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- File selector for directories -->
    <div v-if="isDirectory && logFiles.length" class="mb-3">
      <select v-model="selectedFile" @change="readLog" class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
        <option value="" disabled>Select a log file...</option>
        <option v-for="file in logFiles" :key="file" :value="file">{{ file }}</option>
      </select>
    </div>

    <div v-if="isDirectory && !logFiles.length && !isLoading" class="text-sm text-muted-foreground">
      No log files found in this directory.
    </div>

    <LogViewer
      :logEntries="logEntries"
      :isLoading="isLoading"
      :errorMsg="errorMsg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Connection, LogEntry } from '@/types/interfaces'
import { FileAPI } from '@/lib/backend'
import { useLogParser } from '@/composables/useLogParser'
import LogViewer from './LogViewer.vue'
import { Button } from '@/components/ui/button'
import { FolderOpen, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ connection: Connection }>()

const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const errorMsg = ref('')
const isDirectory = ref(false)
const logFiles = ref<string[]>([])
const selectedFile = ref('')

onMounted(async () => {
  try {
    const type = await FileAPI.IsFileOrDirectory(props.connection.path)
    isDirectory.value = type === 'directory'

    if (isDirectory.value) {
      logFiles.value = await FileAPI.GetLogFilesInDirectory(props.connection.path)
      if (logFiles.value.length) {
        selectedFile.value = logFiles.value[0]
        await readLog()
      }
    } else {
      await readLog()
    }
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  }
})

async function readLog() {
  isLoading.value = true
  errorMsg.value = ''
  try {
    let filePath: string
    if (isDirectory.value) {
      if (!selectedFile.value) return
      // GetLogFilesInDirectory returns filenames only, join with directory path
      const dir = props.connection.path.endsWith('/') ? props.connection.path : props.connection.path + '/'
      filePath = dir + selectedFile.value
    } else {
      filePath = props.connection.path
    }
    const content = await FileAPI.ReadFile(filePath)
    logEntries.value = await useLogParser(content)
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
