import { defineStore } from 'pinia'
import { ref } from 'vue'
import { UpdaterAPI } from '@/lib/backend'

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export const useUpdaterStore = defineStore('updater', () => {
  const status = ref<UpdaterStatus>('idle')
  const currentVersion = ref('')
  const availableVersion = ref('')
  const progress = ref(0)
  const errorMessage = ref('')
  const dismissed = ref(false)

  async function init() {
    currentVersion.value = await UpdaterAPI.Version()

    UpdaterAPI.OnChecking(() => { status.value = 'checking' })
    UpdaterAPI.OnAvailable((info) => {
      status.value = 'available'
      availableVersion.value = info.version
    })
    UpdaterAPI.OnNotAvailable(() => { status.value = 'up-to-date' })
    UpdaterAPI.OnProgress((p) => {
      status.value = 'downloading'
      progress.value = Math.round(p.percent)
    })
    UpdaterAPI.OnDownloaded(() => { status.value = 'downloaded' })
    UpdaterAPI.OnError((message) => {
      status.value = 'error'
      errorMessage.value = message
    })
  }

  async function check() {
    errorMessage.value = ''
    status.value = 'checking'
    await UpdaterAPI.Check()
    // In dev the main process ignores the check; don't spin forever
    setTimeout(() => {
      if (status.value === 'checking') status.value = 'idle'
    }, 15000)
  }

  async function download() {
    status.value = 'downloading'
    progress.value = 0
    await UpdaterAPI.Download()
  }

  function install() {
    UpdaterAPI.Install()
  }

  function dismiss() {
    dismissed.value = true
  }

  return {
    status, currentVersion, availableVersion, progress, errorMessage, dismissed,
    init, check, download, install, dismiss,
  }
})
