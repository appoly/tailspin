<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-semibold">Log Viewer</h1>
      <div class="flex items-center gap-1.5">
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="openFile" :disabled="isLoading">
          <FileUp class="h-3 w-3 mr-1" />
          Open File
        </Button>
        <Button v-if="logEntries.length" variant="outline" size="sm" class="h-7 text-xs" @click="readFile" :disabled="isLoading">
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </div>
    </div>

    <div v-if="!filePath && !isLoading" class="flex flex-col items-center justify-center py-16 text-center">
      <FileText class="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h2 class="text-sm font-medium mb-1">Open a log file</h2>
      <p class="text-xs text-muted-foreground mb-4">Select a Laravel or compatible log file to parse and view.</p>
      <Button variant="outline" size="sm" @click="openFile">
        <FileUp class="h-3.5 w-3.5 mr-1.5" />
        Choose File
      </Button>
    </div>

    <div v-if="filePath" class="mb-2 text-xs text-muted-foreground font-mono">
      {{ filePath }}
    </div>

    <LogViewer
      v-if="filePath"
      :logEntries="logEntries"
      :isLoading="isLoading"
      :errorMsg="errorMsg"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import { FileAPI } from '@/lib/backend'
import { useLogParser } from '@/composables/useLogParser'
import LogViewer from '@/components/LogViewer.vue'
import { Button } from '@/components/ui/button'
import { FileUp, FileText, RefreshCw } from 'lucide-vue-next'

const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const errorMsg = ref('')
const filePath = ref('')

async function openFile() {
  try {
    const path = await FileAPI.OpenFileDialog()
    if (!path) return
    filePath.value = path
    await readFile()
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  }
}

async function readFile() {
  if (!filePath.value) return
  isLoading.value = true
  errorMsg.value = ''
  try {
    const content = await FileAPI.ReadFile(filePath.value)
    logEntries.value = await useLogParser(content)
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}
</script>
