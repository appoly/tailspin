<template>
    <div>
        <h1>{{ connection.name }}</h1>
        <TheLogViewer :connection="connection" />
    </div>
</template>

<script setup lang="ts">
import TheLogViewer from '@/components/TheLogViewer.vue';
import { Connection } from '@/interfaces';

defineProps<{
    connection: Connection;
}>();
</script>

<style scoped></style>