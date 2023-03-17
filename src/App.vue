<template>
  <nav class="navbar navbar-expand-lg bg-body-tertiary">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Home</a>
      <div class="d-flex" style="gap: 0.5rem;">
        <a class="nav-item nav-link" href="/log-viewer">Log Viewer</a>
        <a class="nav-item nav-link" href="/settings">Settings</a>
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
import { RouterView, useRoute } from "vue-router";
import { useUserStore } from "@/stores/useUserStore";

const route = useRoute();
const userStore = useUserStore();

onMounted(() => {
  userStore.init();
});
</script>