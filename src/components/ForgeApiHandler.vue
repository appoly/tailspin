<template>
  <div class="flex items-center gap-2">
    <Button variant="outline" size="sm" @click="syncForge" :disabled="isSyncing">
      <RefreshCw class="h-3 w-3 mr-1" :class="{ 'animate-spin': isSyncing }" />
      {{ isSyncing ? 'Syncing...' : 'Sync from Forge' }}
    </Button>
    <Button v-if="forgeStore.servers.length" variant="ghost" size="sm" @click="clearForge">
      Clear
    </Button>
    <span v-if="syncError" class="text-xs text-destructive">{{ syncError }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ForgeAPI, StorageAPI, CryptoAPI } from '@/lib/backend'
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore'
import type { ForgeServer, ForgeSite } from '@/types/interfaces'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-vue-next'

const forgeStore = useForgeConnectionStore()
const isSyncing = ref(false)
const syncError = ref('')

async function syncForge() {
  isSyncing.value = true
  syncError.value = ''
  try {
    const encryptedKey = await StorageAPI.Get('app.forgeApiKey', '')
    if (!encryptedKey) {
      syncError.value = 'No API key configured'
      return
    }

    const [serversRes, sitesRes] = await Promise.all([
      ForgeAPI.GetServers(encryptedKey as string),
      ForgeAPI.GetSites(encryptedKey as string),
    ])

    const servers: ForgeServer[] = (serversRes?.servers || serversRes || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      ipAddress: s.ip_address || s.ipAddress,
    }))

    const sites: ForgeSite[] = (sitesRes?.sites || sitesRes || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      username: s.username,
      serverId: s.server_id || s.serverId,
    }))

    await forgeStore.setSitesAndServers(sites, servers)
  } catch (e: any) {
    syncError.value = e?.message ?? String(e)
  } finally {
    isSyncing.value = false
  }
}

async function clearForge() {
  await forgeStore.clearSitesAndServers()
}
</script>
