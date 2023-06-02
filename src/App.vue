<template>
  <div class="d-flex">
    <TheSidebar />
    <CommandPalette />
    <div class="flex-grow-1 main-content">
      <template v-if="!applicationStore.canUseSafeStorage">
        <div class="d-block px-3 py-2 text-center text-bold text-white bg-danger" role="alert">
          <strong>Note:</strong> Your system does not support secure storage. Only the file browser will be available.
        </div>
        <LogViewerPage class="pt-2 container-fluid" />
      </template>
      <div v-else class="pt-2 container-fluid">
        <div v-if="applicationStore.routeParams.error" class="alert alert-danger my-2" role="alert">
          {{ applicationStore.routeParams.error }}
        </div>
        <div v-if="applicationStore.routeParams.success" class="alert alert-success my-2" role="alert">
          {{ applicationStore.routeParams.success }}
        </div>

        <!-- Core pages that we only want one of to be visible at a time -->
        <TransitionGroup name="page" mode="out-in">
          <LogViewerPage v-if="applicationStore.page === 'log-viewer'" key="log-viewer.page" />
          <ConnectionsPage v-else-if="applicationStore.page === 'connections'" key="connections.page" />
          <AddConnectionPage v-else-if="applicationStore.page === 'connections.add'" key="connections.add.page" />
          <EditConnectionPage v-else-if="applicationStore.page === 'connections.edit'" key="connections.edit.page" />
          <ForgeConnectionPage v-else-if="applicationStore.page === 'connections.forge'" key="connections.forge.page" />
          <SettingsPage v-else-if="applicationStore.page === 'settings'" key="settings.page" />
          <DownloadsPage v-else-if="applicationStore.page === 'downloads'" key="downloads.page" />
        </TransitionGroup>

        <!-- Connection pages that we want to be able to have multiple of, so use v-show instead of v-if -->
        <template v-for="connection in connectionStore.openConnections" :key="connection.uid">
          <ViewConnection :connection="connection"
            v-show="applicationStore.page === 'connections.page.' + connection.uid" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useUserStore } from "@/stores/useUserStore";
import { useApplicationStore } from "@/stores/useApplicationStore";
import LogViewerPage from "@/pages/LogViewerPage.vue";
import ConnectionsPage from "@/pages/ConnectionsPage.vue";
import TheSidebar from "@/components/TheSidebar.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import AddConnectionPage from "@/pages/AddConnectionPage.vue";
import ViewConnection from "@/pages/ViewConnection.vue";
import { useConnectionStore } from "@/stores/useConnectionStore";
import EditConnectionPage from "@/pages/EditConnectionPage.vue";
import CommandPalette from "@/components/CommandPalette.vue";
import ForgeConnectionPage from "@/pages/ForgeConnectionPage.vue";
import { useForgeConnectionStore } from "./stores/useForgeConnectionStore";
import DownloadsPage from "./pages/DownloadsPage.vue";

const userStore = useUserStore();
const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();
const forgeStore = useForgeConnectionStore();

onMounted(() => {
  userStore.init();
  connectionStore.init();
  forgeStore.init();
  applicationStore.init();
});
</script>

<style scoped>
.page-enter-active {
  transition: all 0.2s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}
</style>