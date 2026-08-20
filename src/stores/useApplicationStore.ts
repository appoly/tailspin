import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { StorageAPI, CryptoAPI } from '@/lib/backend'
import type { Download } from '@/types/interfaces'

export const useApplicationStore = defineStore('application', () => {
  const openConnections = ref<string[]>([])
  const page = ref('connections')
  const routeParams = ref<Record<string, string>>({})
  const canUseSafeStorage = ref(false)
  const downloads = ref<Download[]>([])
  const forgeSectionEnabled = ref(false)
  const autoFetching = ref<{
    connectionId: string | null
    intervalId: ReturnType<typeof setInterval> | undefined
  }>({
    connectionId: null,
    intervalId: undefined,
  })

  async function init() {
    canUseSafeStorage.value = await CryptoAPI.IsEncryptionAvailable()
    page.value = canUseSafeStorage.value ? 'connections' : 'log-viewer'
    await initForgeSectionEnabled()
  }

  function changePage(newPage: string, params: Record<string, string> = {}) {
    routeParams.value = params
    page.value = newPage
  }

  function addOpenConnection(connectionId: string) {
    if (!openConnections.value.includes(connectionId)) {
      openConnections.value.push(connectionId)
    }
  }

  function closeConnection(connectionId: string) {
    openConnections.value = openConnections.value.filter((c) => c !== connectionId)
  }

  function closeAllConnections() {
    openConnections.value = []
  }

  function goToConnection(connectionId: string) {
    addOpenConnection(connectionId)
    changePage('connections.page.' + connectionId)
  }

  function updateDownloads(item: string, status: 'completed' | 'failed' | 'inProgress'): boolean {
    const download = downloads.value.find((d) => d.name === item)
    if (status === 'inProgress' && download && download.type === 'inProgress') return false
    if (!download) {
      downloads.value.push({ name: item, type: status, date: new Date() })
    } else {
      download.type = status
      download.date = new Date()
    }
    return true
  }

  async function initForgeSectionEnabled() {
    forgeSectionEnabled.value = (await StorageAPI.Get('app.forgeEnabled', true)) !== false
  }

  async function toggleForgeSectionEnabled() {
    forgeSectionEnabled.value = !forgeSectionEnabled.value
    await StorageAPI.Set('app.forgeEnabled', forgeSectionEnabled.value)
  }

  async function deleteAllConfigData() {
    await StorageAPI.Clear()
  }

  return {
    openConnections, page, routeParams, canUseSafeStorage, downloads,
    forgeSectionEnabled, autoFetching,
    init, changePage, addOpenConnection, closeConnection, closeAllConnections,
    goToConnection, updateDownloads, initForgeSectionEnabled,
    toggleForgeSectionEnabled, deleteAllConfigData,
  }
})
