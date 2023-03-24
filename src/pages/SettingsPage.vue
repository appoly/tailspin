<template>
    <div>
        <h1>Settings</h1>
        <button @click="userStore.toggleTheme" class="btn btn-primary">Toggle Theme</button>
    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/useUserStore';

const userStore = useUserStore();

</script>

<style scoped></style>