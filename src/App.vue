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

  <h1>{{ route.name ?? 'Home' }}</h1>

  <RouterView />
</template>

<script setup lang="ts">
import { RouterView, useRoute } from "vue-router";
const route = useRoute();

</script>