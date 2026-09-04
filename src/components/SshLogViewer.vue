<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span id="logViewerHeader" class="flex items-baseline gap-1 min-w-0 text-xs font-mono" :title="headerPath">
          <span class="text-muted-foreground truncate">{{ headerBase }}</span>
          <template v-if="headerFile">
            <span class="shrink-0 text-muted-foreground">·</span>
            <span class="shrink-0 text-foreground">{{ headerFile }}</span>
          </template>
        </span>
        <span v-if="isUpdating" class="text-xs text-blue-400 animate-pulse shrink-0">Updating...</span>
      </div>
      <div class="flex items-center gap-1.5">
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="downloadFile()" :disabled="isLoading || isDownloading">
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

    <!-- Auto-fetch controls. A rotated file is finished being written to, so
         polling it would only cost handshakes. -->
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

    <!-- SSH Options panel -->
    <LogSshOptions
      v-if="showSshOptions"
      :modelValue="sshOptions"
      :isLoading="isLoading"
      :currentFileSize="currentFileSize"
      @update:modelValue="sshOptions = $event"
      @submitted="readLog"
    />

    <LogFileBrowser
      v-if="isDirectory"
      :files="remoteFiles"
      :selected="selectedFile"
      canDownload
      @select="selectFile"
      @download="downloadFile"
    />

    <!-- An auth failure is worth a word about what to fix, so it is rendered here
         with the hint under it rather than inside LogViewer. -->
    <template v-if="showAuthFailureHint">
      <div class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
        {{ errorMsg }}
      </div>
      <p class="text-xs text-muted-foreground mt-1.5 mb-2">{{ authFailureHint }}</p>
    </template>

    <LogViewer
      :logEntries="logEntries"
      :isLoading="isLoading"
      :errorMsg="showAuthFailureHint ? '' : errorMsg"
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
import { ref, computed, onMounted } from 'vue'
import type { Connection, LogEntry, LogFile, SshRequest, SshOptions } from '@/types/interfaces'
import { SshAPI, StorageAPI } from '@/lib/backend'
import { useLogParser } from '@/composables/useLogParser'
import { useAutoFetch } from '@/composables/useAutoFetch'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { basename, isRotatedLogName, parseRemoteLogFiles } from '@/helpers'
import LogViewer from './LogViewer.vue'
import LogSshOptions from './LogSshOptions.vue'
import LogFileBrowser from './LogFileBrowser.vue'
import ConnectionSshPassphraseDialog from './ConnectionSshPassphraseDialog.vue'
import { Button } from '@/components/ui/button'
import { Download, Settings, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  connection: Connection
  /** Shown under the error when the failure looks like SSH auth rather than anything else. */
  authFailureHint?: string
}>()

const applicationStore = useApplicationStore()
const logEntries = ref<LogEntry[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const isDownloading = ref(false)
const errorMsg = ref('')
const isDirectory = ref(false)
const hasProbedPath = ref(false)
const remoteFiles = ref<LogFile[]>([])
const selectedFile = ref('')
const showSshOptions = ref(false)
const showPassphraseDialog = ref(false)
const passphrase = ref('')
const sshOptions = ref<SshOptions>({ numberOfBytes: 500 * 1024 })
const currentFileSize = ref(0)
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
})

const currentPath = computed(() => (isDirectory.value ? selectedFile.value : props.connection.path))

const isRotatedSelection = computed(() => {
  // Until the path has been probed we do not know whether connection.path is a
  // directory, so assume the live log rather than flashing the rotated notice.
  if (!hasProbedPath.value) return false
  const path = currentPath.value
  return !!path && isRotatedLogName(basename(path))
})

// The directory can be long, so it gets to truncate while the file name stays whole.
const headerBase = computed(() => `${props.connection.ssh?.host}:${props.connection.path}`)
const headerFile = computed(() => (isDirectory.value && selectedFile.value ? basename(selectedFile.value) : ''))
const headerPath = computed(() => (headerFile.value ? `${headerBase.value} · ${headerFile.value}` : headerBase.value))

const showAuthFailureHint = computed(() => {
  if (!errorMsg.value || !props.authFailureHint) return false
  const message = errorMsg.value.toLowerCase()
  return (
    message.includes('authentication') ||
    message.includes('all configured authentication methods failed') ||
    message.includes('permission denied')
  )
})

onMounted(async () => {
  const storedBytes = await StorageAPI.Get('ssh.numberOfBytes', 500 * 1024)
  sshOptions.value.numberOfBytes = storedBytes as number

  if (props.connection.ssh?.passphraseRequired) {
    showPassphraseDialog.value = true
  } else {
    await readLog()
  }
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
    hasProbedPath.value = true

    if (isDirectory.value) {
      const dirRes = await SshAPI.GetFilesInDirectory(req, props.connection.path)
      if (!dirRes.success) {
        errorMsg.value = dirRes.message || 'Failed to list directory'
        return
      }
      remoteFiles.value = parseRemoteLogFiles(dirRes.message || '')
      // Newest file by default, and again if whatever was open has rotated away.
      const stillThere = remoteFiles.value.some(file => file.path === selectedFile.value)
      if (!stillThere) {
        selectedFile.value = remoteFiles.value[0]?.path ?? ''
      }
    }

    await loadSelected(req)
  } catch (e: any) {
    errorMsg.value = e?.message ?? String(e)
  } finally {
    isLoading.value = false
  }
}

/** Read whatever is currently selected, without re-probing the directory. */
async function loadSelected(request?: SshRequest) {
  const filePath = currentPath.value
  if (!filePath) return

  const req = request ?? buildSshRequest()
  const res = await SshAPI.ReadFromPath(req, filePath, sshOptions.value.numberOfBytes)
  if (!res.success) {
    errorMsg.value = res.message || 'Failed to read file'
    logEntries.value = []
    return
  }

  if (res.fileSize) {
    currentFileSize.value = parseInt(res.fileSize, 10) || 0
  }
  lastReadBytes.value = currentFileSize.value

  logEntries.value = await useLogParser(res.message || '')
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

/** Returns the entries this tick brought in, so the composable can announce errors. */
async function fetchUpdates(): Promise<LogEntry[]> {
  if (isUpdating.value || isLoading.value) return []
  isUpdating.value = true
  try {
    const req = buildSshRequest()
    const filePath = currentPath.value
    if (!filePath) return []

    const res = await SshAPI.ReadNextFromPath(req, filePath, lastReadBytes.value)
    if (res.success && res.message) {
      if (res.fileSize) {
        lastReadBytes.value = parseInt(res.fileSize, 10) || lastReadBytes.value
      }
      const newEntries = await useLogParser(res.message)
      if (newEntries.length) {
        logEntries.value = [...newEntries, ...logEntries.value]
      }
      return newEntries
    }
  } catch {
    // Silently fail on auto-fetch
  } finally {
    isUpdating.value = false
  }
  return []
}

function toggleSshOptions() {
  showSshOptions.value = !showSshOptions.value
}

async function downloadFile(file?: LogFile) {
  const filePath = file?.path ?? currentPath.value
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
