<template>
  <TheSidebar />

  <div class="container-fluid my-4">
    <LogViewerPage v-for="connection in applicationStore.connections" :key="connection.uid" :connection="connection" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useUserStore } from "@/stores/useUserStore";
import { useApplicationStore } from "@/stores/useApplicationStore";
import LogViewerPage from "@/pages/LogViewerPage.vue";
import TheSidebar from "@/components/TheSidebar.vue";

const userStore = useUserStore();
const applicationStore = useApplicationStore();

onMounted(() => {
  userStore.init();
  applicationStore.init();
});
</script>