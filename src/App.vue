<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Home</a>
      <div class="d-flex" style="gap: 0.5rem;">
        <RouterLink class="nav-item nav-link" to="/log-viewer">Log Viewer</RouterLink>
        <RouterLink class="nav-item nav-link" to="/settings">Settings</RouterLink>
      </div>
    </div>
  </nav>

  <div class="container-fluid my-4">
    <h1>{{ route.name ?? 'Home' }}</h1>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useUserStore } from "@/stores/useUserStore";

const route = useRoute();
const userStore = useUserStore();

onMounted(() => {
  userStore.init();
});
</script>