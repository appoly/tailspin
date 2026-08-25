<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span id="logViewerHeader" class="text-xs text-muted-foreground font-mono">{{ connection.ssh?.host }}:{{ connection.path }}</span>
        <span v-if="isUpdating" class="text-xs text-blue-400 animate-pulse">Updating...</span>
      </div>
      <div class="flex items-center gap-1.5">
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="downloadFile" :disabled="isLoading || isDownloading">
          <Download class="h-3 w-3 mr-1" :class="{ 'animate-bounce': isDownloading }" />
          Download
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="toggleSshOptions">
          <Settings class="h-3 w-3 mr-1" />
          Options
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="readLog" :disabled="isLoading">
          <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Auto-fetch controls -->
    <div class="flex items-center gap-2 mb-3">
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

    <!-- SSH Options panel -->
    <LogSshOptions
      v-if="showSshOptions"
      :modelValue="sshOptions"
      :isLoading="isLoading"
      :currentFileSize="currentFileSize"
      @update:modelValue="sshOptions = $event"
      @submitted="readLog"
    />

    <!-- File selector for directories -->
    <div v-if="isDirectory && remoteFiles.length" class="mb-3">
      <select v-model="selectedFile" @change="readLog" class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
        <option value="" disabled>Select a log file...</option>
        <option v-for="file in remoteFiles" :key="file.path" :value="file.path">
          {{ file.path }} ({{ file.size }})
        </option>
      </select>
    </div>

    <LogViewer
      :logEntries="logEntries"
      :isLoading="isLoading"
      :errorMsg="errorMsg"
    />

    <!-- Passphrase dialog -->
    <ConnectionSshPassphraseDialog
      :open="showPassphraseDialog"
      @update:open="showPassphraseDialog = $event"
      @submit="onPassphrase"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Connection, LogEntry, SshRequest, SshOptions } from '@/types/interfaces'
import { SshAPI, CryptoAPI, StorageAPI } from '@/lib/backend'
import { useLogParser } from '@/composables/useLogParser'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { bytesToHumanReadableFileSize } from '@/helpers'
import LogViewer from './LogViewer.vue'
import LogSshOptions from './LogSshOptions.vue'
import ConnectionSshPassphraseDialog from './ConnectionSshPassphraseDialog.vue'
import { Button } from '@/components/ui/button'
import { Download, Settings, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ connection: Connection }>()

const applicationStore = useApplicationStore()
const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const isDownloading = ref(false)
const errorMsg = ref('')
const isDirectory = ref(false)
const remoteFiles = ref<{ path: string; size: string }[]>([])
const selectedFile = ref('')
const showSshOptions = ref(false)
const showPassphraseDialog = ref(false)
const passphrase = ref('')
const sshOptions = ref<SshOptions>({ numberOfBytes: 500 * 1024 })
const currentFileSize = ref(0)
const lastReadBytes = ref(0)
const autoFetchSeconds = ref(0)
const countdown = ref(0)
let autoFetchIntervalId: ReturnType<typeof setInterval> | undefined
let countdownIntervalId: ReturnType<typeof setInterval> | undefined

const autoFetchIntervals = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
]

onMounted(async () => {
  const storedBytes = await StorageAPI.Get('ssh.numberOfBytes', 500 * 1024)
  sshOptions.value.numberOfBytes = storedBytes as number

  if (props.connection.ssh?.passphraseRequired) {
    showPassphraseDialog.value = true
  } else {
    await readLog()
  }
})

onUnmounted(() => {
  stopAutoFetch()
})

function buildSshRequest(): SshRequest {
  const ssh = props.connection.ssh!
  return {
    host: ssh.host,
    port: ssh.port,
    username: ssh.username,
    passwordType: ssh.passwordType,
    password: ssh.password,
    passwordIsEncrypted: ssh.passwordType === 'password',
    passphrase: passphrase.value || undefined,
  }
}

async function onPassphrase(p: string) {
  passphrase.value = p
  await readLog()
}

async function readLog() {
  isLoading.value = true
  errorMsg.value = ''
  lastReadBytes.value = 0

  try {
    const req = buildSshRequest()
    const typeRes = await SshAPI.IsFileOrDirectory(req, props.connection.path)

    if (!typeRes.success) {
      if (typeRes.message?.toLowerCase().includes('passphrase')) {
        showPassphraseDialog.value = true
        return
      }
      errorMsg.value = typeRes.message || 'Failed to connect'
      return
    }

    isDirectory.value = typeRes.message === 'directory'

    if (isDirectory.value) {
      const dirRes = await SshAPI.GetFilesInDirectory(req, props.connection.path)
      if (!dirRes.success) {
        errorMsg.value = dirRes.message || 'Failed to list directory'
        return
      }
      remoteFiles.value = parseLsOutput(dirRes.message || '')
      if (remoteFiles.value.length && !selectedFile.value) {
        selectedFile.value = remoteFiles.value[0].path
      }
    }

    const filePath = isDirectory.value ? selectedFile.value : props.connection.path
    if (!filePath) return

    const res = await SshAPI.ReadFromPath(req, filePath, sshOptions.value.numberOfBytes)
    if (!res.success) {
      errorMsg.value = res.message || 'Failed to read file'
      return
    }

    if (res.fileSize) {
      currentFileSize.value = parseInt(res.fileSize, 10) || 0
    }
    lastReadBytes.value = currentFileSize.value

    logEntries.value = await useLogParser(res.message || '')
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}

async function fetchUpdates() {
  if (isUpdating.value || isLoading.value) return
  isUpdating.value = true
  try {
    const req = buildSshRequest()
    const filePath = isDirectory.value ? selectedFile.value : props.connection.path
    if (!filePath) return

    const res = await SshAPI.ReadNextFromPath(req, filePath, lastReadBytes.value)
    if (res.success && res.message) {
      if (res.fileSize) {
        lastReadBytes.value = parseInt(res.fileSize, 10) || lastReadBytes.value
      }
      const newEntries = await useLogParser(res.message)
      if (newEntries.length) {
        logEntries.value = [...newEntries, ...logEntries.value]
      }
    }
  } catch {
    // Silently fail on auto-fetch
  } finally {
    isUpdating.value = false
  }
}

function parseLsOutput(output: string): { path: string; size: string }[] {
  const lines = output.split('\n').filter(l => l.trim())
  const files: { path: string; size: string }[] = []
  for (const line of lines) {
    const spaceIdx = line.trim().indexOf(' ')
    if (spaceIdx === -1) continue
    const size = line.trim().substring(0, spaceIdx)
    const path = line.trim().substring(spaceIdx + 1)
    if (path) {
      files.push({
        path,
        size: bytesToHumanReadableFileSize(parseInt(size, 10) || 0),
      })
    }
  }
  return files
}

function toggleSshOptions() {
  showSshOptions.value = !showSshOptions.value
}

function setAutoFetch(seconds: number) {
  stopAutoFetch()
  autoFetchSeconds.value = seconds
  countdown.value = seconds

  countdownIntervalId = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) countdown.value = seconds
  }, 1000)

  autoFetchIntervalId = setInterval(() => {
    fetchUpdates()
    countdown.value = seconds
  }, seconds * 1000)

  applicationStore.autoFetching = {
    connectionId: props.connection.uid,
    intervalId: autoFetchIntervalId,
  }
}

function stopAutoFetch() {
  autoFetchSeconds.value = 0
  countdown.value = 0
  if (autoFetchIntervalId) clearInterval(autoFetchIntervalId)
  if (countdownIntervalId) clearInterval(countdownIntervalId)
  autoFetchIntervalId = undefined
  countdownIntervalId = undefined
  applicationStore.autoFetching = { connectionId: null, intervalId: undefined }
}

async function downloadFile() {
  const filePath = isDirectory.value ? selectedFile.value : props.connection.path
  if (!filePath) return

  const safeName = filePath.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '')
  const fileName = `${props.connection.ssh?.host}_${safeName}`

  if (!applicationStore.updateDownloads(fileName, 'inProgress')) return
  isDownloading.value = true

  try {
    const req = buildSshRequest()
    const res = await SshAPI.DownloadFile(req, filePath, fileName)
    applicationStore.updateDownloads(fileName, res.success ? 'completed' : 'failed')
  } catch {
    applicationStore.updateDownloads(fileName, 'failed')
  } finally {
    isDownloading.value = false
  }
}
</script>
