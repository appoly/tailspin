import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StorageAPI } from '@/lib/backend'
import type { ForgeServer, ForgeSite } from '@/types/interfaces'

export const useForgeConnectionStore = defineStore('forgeConnection', () => {
  const servers = ref<ForgeServer[]>([])
  const sites = ref<ForgeSite[]>([])

  async function init() {
    const forge = (await StorageAPI.Get('forge', {})) as { servers?: ForgeServer[]; sites?: ForgeSite[] }
    servers.value = forge.servers ?? []
    sites.value = forge.sites ?? []
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
