import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { StorageAPI } from '@/lib/backend'
import { useApplicationStore } from './useApplicationStore'
import type { Connection } from '@/types/interfaces'
import { unproxify } from '@/helpers'

export const useConnectionStore = defineStore('connection', () => {
  const connections = ref<Connection[]>([])

  const openConnections = computed(() => {
    const applicationStore = useApplicationStore()
    return connections.value.filter((c) => applicationStore.openConnections.includes(c.uid))
  })

  async function init() {
    connections.value = (await StorageAPI.Get('connections', [])) as Connection[]
  }

  function getById(connectionId: string): Connection | undefined {
    return connections.value.find((c) => c.uid === connectionId)
  }

  async function addConnection(connection: Connection) {
    connections.value.push(connection)
    await StorageAPI.Set('connections', unproxify(connections.value))
  }

  async function updateConnection(connection: Connection) {
    const index = connections.value.findIndex((c) => c.uid === connection.uid)
    if (index !== -1) connections.value[index] = connection
    await StorageAPI.Set('connections', unproxify(connections.value))
  }

  async function removeConnection(connectionId: string) {
    connections.value = connections.value.filter((c) => c.uid !== connectionId)
    await StorageAPI.Set('connections', unproxify(connections.value))
    const applicationStore = useApplicationStore()
    applicationStore.closeConnection(connectionId)
  }

  async function deleteAllConnections() {
    connections.value = []
    await StorageAPI.Set('connections', [])
    const applicationStore = useApplicationStore()
    applicationStore.closeAllConnections()
  }

  async function reorderConnections(newArray: Connection[]) {
    connections.value = newArray
    await StorageAPI.Set('connections', unproxify(connections.value))
  }

  return {
    connections, openConnections,
    init, getById, addConnection, updateConnection,
    removeConnection, deleteAllConnections, reorderConnections,
  }
})
