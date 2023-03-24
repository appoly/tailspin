<template>
    <div class="col-lg-4 col-6">
        <div class="connection-card card shadow" role="button">
            hello
            {{ connection.name ?? '?' }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { Connection } from "@/interfaces"
defineProps<{
    connection: Connection;
}>();
</script>
