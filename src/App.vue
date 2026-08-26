<template>
  <TooltipProvider :delay-duration="300">
  <div class="h-screen flex flex-col overflow-hidden" @contextmenu.prevent>
    <!-- Custom titlebar -->
    <AppTitlebar />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar />

      <!-- Main content -->
      <main class="flex-1 overflow-y-auto">
        <div class="p-3 max-w-full">
          <!-- Update banner -->
          <div
            v-if="!updaterStore.dismissed && (updaterStore.status === 'available' || updaterStore.status === 'downloaded')"
            class="mb-2 flex items-center gap-2 rounded-md border bg-card p-2.5 text-xs"
          >
            <ArrowDownCircle class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span class="flex-1">
              {{ updaterStore.status === 'downloaded'
                ? `Update v${updaterStore.availableVersion} is ready to install.`
                : `Update v${updaterStore.availableVersion} is available.` }}
            </span>
            <Button
              size="sm"
              class="h-6 text-xs"
              @click="updaterStore.status === 'downloaded' ? updaterStore.install() : updaterStore.download()"
            >
              {{ updaterStore.status === 'downloaded' ? 'Restart to update' : 'Download' }}
            </Button>
            <button class="rounded-sm p-0.5 text-muted-foreground hover:text-foreground" @click="updaterStore.dismiss()">
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Flash messages -->
          <div v-if="applicationStore.routeParams.error"
            class="mb-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {{ applicationStore.routeParams.error }}
          </div>
          <div v-if="applicationStore.routeParams.success"
            class="mb-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-500">
            {{ applicationStore.routeParams.success }}
          </div>

          <!-- Core pages (v-if for single instance) -->
          <Transition name="page">
            <LogViewerPage v-if="applicationStore.page === 'log-viewer'" key="log-viewer" />
            <ConnectionsPage v-else-if="applicationStore.page === 'connections'" key="connections" />
            <AddConnectionPage v-else-if="applicationStore.page === 'connections.add'" key="connections-add" />
            <EditConnectionPage v-else-if="applicationStore.page === 'connections.edit'" key="connections-edit" />
            <ForgeConnectionPage v-else-if="applicationStore.page === 'connections.forge'" key="forge" />
            <SettingsPage v-else-if="applicationStore.page === 'settings'" key="settings" />
            <DownloadsPage v-else-if="applicationStore.page === 'downloads'" key="downloads" />
          </Transition>

          <!-- Open connection viewers (v-show to keep state) -->
          <template v-for="connection in connectionStore.openConnections" :key="connection.uid">
            <ViewConnectionPage
              :connection="connection"
              v-show="applicationStore.page === 'connections.page.' + connection.uid"
            />
          </template>
        </div>
      </main>
    </div>

    <!-- Command Palette -->
    <AppCommandPalette />
  </div>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/useUserStore'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore'
import { useUpdaterStore } from '@/stores/useUpdaterStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, X } from 'lucide-vue-next'
import AppTitlebar from '@/components/AppTitlebar.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppCommandPalette from '@/components/AppCommandPalette.vue'
import LogViewerPage from '@/pages/LogViewerPage.vue'
import ConnectionsPage from '@/pages/ConnectionsPage.vue'
import AddConnectionPage from '@/pages/AddConnectionPage.vue'
import EditConnectionPage from '@/pages/EditConnectionPage.vue'
import ViewConnectionPage from '@/pages/ViewConnectionPage.vue'
import ForgeConnectionPage from '@/pages/ForgeConnectionPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import DownloadsPage from '@/pages/DownloadsPage.vue'

const userStore = useUserStore()
const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()
const forgeStore = useForgeConnectionStore()
const updaterStore = useUpdaterStore()

onMounted(async () => {
  try {
    // Independent of each other, and each one is an IPC round trip.
    await Promise.all([
      userStore.init(),
      connectionStore.init(),
      forgeStore.init(),
      applicationStore.init(),
      updaterStore.init(),
    ])
  } finally {
    // Only now drop the boot loader. Removing it at mount painted an empty
    // connections list that filled in a moment later.
    window.postMessage({ payload: 'removeLoading' }, '*')
  }
})
</script>

<style>
/*
 * Enter-only, and deliberately not mode="out-in": with out-in the incoming page
 * never rendered — the app was left showing an empty <main> after any sidebar
 * navigation. Without a leave transition the old page is removed immediately,
 * so nothing overlaps and there is nothing to wait on.
 */
.page-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
