import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StorageAPI } from '@/lib/backend'
import type { ForgeServer, ForgeSite } from '@/types/interfaces'

export const useForgeConnectionStore = defineStore('forgeConnection', () => {
  const servers = ref<ForgeServer[]>([])
  const sites = ref<ForgeSite[]>([])

  async function init() {
    servers.value = (await StorageAPI.Get('forge.servers', [])) as ForgeServer[]
    sites.value = (await StorageAPI.Get('forge.sites', [])) as ForgeSite[]
  }

  async function setSitesAndServers(newSites: ForgeSite[], newServers: ForgeServer[]) {
    await StorageAPI.Set('forge', { servers: newServers, sites: newSites })
    servers.value = newServers
    sites.value = newSites
  }

  async function clearSitesAndServers() {
    await StorageAPI.Set('forge', { servers: [], sites: [] })
    servers.value = []
    sites.value = []
  }

  return { servers, sites, init, setSitesAndServers, clearSitesAndServers }
})
