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

        <ConnectionsPage v-if="applicationStore.page === 'connections'" />
        <AddConnectionPage v-if="applicationStore.page === 'connections.add'" />
        <EditConnectionPage v-if="applicationStore.page === 'connections.edit'" />
        <ForgeConnectionPage v-if="applicationStore.page === 'connections.forge'" />
        <SettingsPage v-if="applicationStore.page === 'settings'" />

        <!-- Example for now, a standard log viewer page -->
        <LogViewerPage v-if="applicationStore.page === 'log-viewer'" />

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