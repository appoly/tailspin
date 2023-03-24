<template>
    <div>
        <h1>Connections</h1>
        <div class="row">
            <ConnectionCard v-for="connection in applicationStore.connections" :key="connection.uid"
                :connection="connection" @click="() => applicationStore.goToConnection(connection.uid)"
                @delete="() => applicationStore.removeConnection(connection.uid)" />
            <div class="col-lg-4 col-6">
                <div class="connection-card card shadow" role="button"
                    @click="() => applicationStore.changePage('connections.add')">
                    <div class="d-flex justify-content-between">
                        <span>Add new connection</span>
                        <i class="bi bi-arrow-right-circle-fill"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ConnectionCard from '@/components/ConnectionCard.vue';
import { useApplicationStore } from '@/stores/useApplicationStore';

const applicationStore = useApplicationStore();

</script>

<style scoped></style>