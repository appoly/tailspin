<template>
  <div class="d-flex">
    <TheSidebar />
    <div class="flex-grow-1 container-fluid pt-2">
      <ConnectionsPage v-if="applicationStore.page === 'connections'" />
      <SettingsPage v-if="applicationStore.page === 'settings'" />

      <!-- Example for now, a standard log viewer page -->
      <LogViewerPage v-if="applicationStore.page === `log-viewer`" />

      <div class="container-fluid my-4">
        <LogViewerPage v-for="connection in applicationStore.connections" :key="connection.uid" :connection="connection"
          v-if="applicationStore.page === `connections.view`" />
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

const userStore = useUserStore();
const applicationStore = useApplicationStore();

onMounted(() => {
  userStore.init();
  applicationStore.init();
});
</script>