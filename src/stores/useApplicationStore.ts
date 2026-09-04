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
  // Errors auto-fetched into a tab the user has not looked at since, keyed by
  // connection uid, so the titlebar can mark the tab.
  const unseenErrors = ref<Record<string, number>>({})

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

  function addUnseenErrors(connectionId: string, count: number) {
    if (count <= 0) return
    unseenErrors.value[connectionId] = (unseenErrors.value[connectionId] ?? 0) + count
  }

  function clearUnseenErrors(connectionId: string) {
    delete unseenErrors.value[connectionId]
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
    forgeSectionEnabled, autoFetching, unseenErrors,
    init, changePage, addOpenConnection, closeConnection, closeAllConnections,
    goToConnection, updateDownloads, addUnseenErrors, clearUnseenErrors, initForgeSectionEnabled,
    toggleForgeSectionEnabled, deleteAllConfigData,
  }
})
