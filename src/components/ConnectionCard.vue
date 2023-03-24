<template>
    <div class="col-lg-4 col-6 mb-2">
        <div class="connection-card card shadow" role="button">
            <div class="d-flex justify-content-between">
                <span>{{ connection.name ?? '?' }}</span>
                <button class="btn btn-danger btn-sm" @click.stop="() => $emit('delete')">Delete</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Connection } from "@/interfaces"
defineProps<{
    connection: Connection;
}>();

defineEmits(["delete"]);
</script>
