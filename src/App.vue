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
          <Transition name="page" mode="out-in">
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
import { TooltipProvider } from '@/components/ui/tooltip'
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

onMounted(async () => {
  await userStore.init()
  await connectionStore.init()
  await forgeStore.init()
  await applicationStore.init()
})
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.page-leave-to {
  opacity: 0;
}
</style>
