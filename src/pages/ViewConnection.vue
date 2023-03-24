<template>
    <div>
        <h1>{{ connection.name }}</h1>
        <LogViewerPage />
    </div>
</template>

<script setup lang="ts">
import { Connection } from '@/interfaces';
import LogViewerPage from './LogViewerPage.vue';

defineProps<{
    connection: Connection;
}>();
</script>

<style scoped></style>