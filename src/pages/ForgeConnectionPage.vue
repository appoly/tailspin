<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-semibold">Forge Connections</h1>
      <Button variant="ghost" size="sm" class="h-7 text-xs" @click="applicationStore.changePage('connections')">
        <ArrowLeft class="h-3 w-3 mr-1" />
        Back
      </Button>
    </div>

    <!-- No API Key -->
    <div v-if="!hasApiKey">
      <ForgeApiKeyForm @updated="checkApiKey" />
    </div>

    <!-- Has API key but no servers -->
    <div v-else-if="!forgeStore.servers.length && !selectedSite">
      <div class="text-sm text-muted-foreground mb-3">No servers synced yet.</div>
      <ForgeApiHandler />
    </div>

    <!-- Viewing a site log -->
    <div v-else-if="selectedSite">
      <div class="flex items-center justify-between mb-3">
        <Button variant="ghost" size="sm" class="h-7 text-xs" @click="selectedSite = null">
          <ArrowLeft class="h-3 w-3 mr-1" />
          Back to Sites
        </Button>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="saveToConnections">
          <Plus class="h-3 w-3 mr-1" />
          Save to Connections
        </Button>
      </div>
      <SshLogViewer :connection="siteConnection!" />
    </div>

    <!-- Server/site list -->
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <ForgeApiHandler />
      </div>

      <div class="mb-3">
        <Input
          v-model="searchQuery"
          placeholder="Search servers or sites..."
          class="h-8 text-sm"
        />
      </div>

      <div v-for="server in filteredServers" :key="server.id" class="mb-4">
        <h3 class="text-xs font-medium text-muted-foreground mb-1.5">
          {{ server.name }}
          <span class="font-mono ml-1">{{ server.ipAddress }}</span>
        </h3>
        <div class="border rounded-md divide-y">
          <div
            v-for="site in getSitesForServer(server.id)"
            :key="site.id"
            class="flex items-center justify-between px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
            @click="selectSite(server, site)"
          >
            <span class="text-sm">{{ site.name }}</span>
            <ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div v-if="!filteredServers.length" class="text-sm text-muted-foreground text-center py-8">
        No servers or sites match your search.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Connection, ForgeServer, ForgeSite } from '@/types/interfaces'
import { StorageAPI } from '@/lib/backend'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useUserStore } from '@/stores/useUserStore'
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore'
import ForgeApiKeyForm from '@/components/ForgeApiKeyForm.vue'
import ForgeApiHandler from '@/components/ForgeApiHandler.vue'
import SshLogViewer from '@/components/SshLogViewer.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, ChevronRight, Plus } from 'lucide-vue-next'

const applicationStore = useApplicationStore()
const userStore = useUserStore()
const forgeStore = useForgeConnectionStore()

const hasApiKey = ref(false)
const searchQuery = ref('')
const selectedSite = ref<ForgeSite | null>(null)
const selectedServer = ref<ForgeServer | null>(null)

onMounted(async () => {
  await checkApiKey()
})

async function checkApiKey() {
  hasApiKey.value = await StorageAPI.Has('app.forgeApiKey')
}

const filteredServers = computed(() => {
  if (!searchQuery.value) return forgeStore.servers
  const q = searchQuery.value.toLowerCase()
  return forgeStore.servers.filter(server => {
    if (server.name.toLowerCase().includes(q) || server.ipAddress.toLowerCase().includes(q)) return true
    return forgeStore.sites.some(site => site.serverId === server.id && site.name.toLowerCase().includes(q))
  })
})

function getSitesForServer(serverId: number) {
  const q = searchQuery.value.toLowerCase()
  return forgeStore.sites.filter(site => {
    if (site.serverId !== serverId) return false
    if (!q) return true
    return site.name.toLowerCase().includes(q)
  })
}

function selectSite(server: ForgeServer, site: ForgeSite) {
  selectedServer.value = server
  selectedSite.value = site
}

const siteConnection = computed<Connection | null>(() => {
  if (!selectedSite.value || !selectedServer.value) return null
  return {
    uid: `forge-${selectedSite.value.id}`,
    name: selectedSite.value.name,
    icon: 'server',
    path: `/home/${selectedSite.value.username}/${selectedSite.value.name}/storage/logs`,
    type: 'remote',
    ssh: {
      host: selectedServer.value.ipAddress,
      port: 22,
      username: selectedSite.value.username,
      passwordType: 'key',
      password: userStore.defaultSshPath || '',
    },
  }
})

function saveToConnections() {
  if (!siteConnection.value) return
  const { uid, ...base } = siteConnection.value
  applicationStore.changePage('connections.add', {
    prefillConnection: JSON.stringify(base),
  })
}
</script>
