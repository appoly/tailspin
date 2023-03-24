<template>
  <div class="d-flex">
    <TheSidebar />
    <div class="flex-grow-1 container-fluid pt-2 main-content">
      <ConnectionsPage v-if="applicationStore.page === 'connections'" />
      <AddConnectionPage v-if="applicationStore.page === 'connections.add'" />
      <SettingsPage v-if="applicationStore.page === 'settings'" />

      <!-- Example for now, a standard log viewer page -->
      <LogViewerPage v-if="applicationStore.page === 'log-viewer'" />

      <div class="container-fluid my-4">
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
import SettingsPage from "./pages/SettingsPage.vue";
import AddConnectionPage from "./pages/AddConnectionPage.vue";
import ViewConnection from "./pages/ViewConnection.vue";
import { useConnectionStore } from "./stores/useConnectionStore";

const userStore = useUserStore();
const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

onMounted(() => {
  userStore.init();
  connectionStore.init();
});
</script>