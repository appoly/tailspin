<template>
    <div>
        <div class="d-flex">
            <h1>Connections</h1>
            <span class="ms-2 align-self-center">
                <i role="button" @click="() => applicationStore.changePage('connections.add')" class="bi bi-plus-circle-fill"></i>
            </span>
        </div>

        <!-- search for a connection -->
        <div class="input-group mb-3">
            <input type="text" class="form-control" placeholder="Search for a connection" v-model="searchTerm" />
        </div>

        <!-- Buttons to toggle between list and grid view -->
        <div class="d-flex justify-content-end">
            <i role="button" :class="['h3 bi bi-list', { 'selected': viewMode === 'list' }]" @click="() => viewMode = 'list'"></i>
            <i role="button" :class="['h3 bi bi-grid', { 'selected': viewMode === 'grid' }]" @click="() => viewMode = 'grid'"></i>
        </div>

        <div :class="['d-flex flex-wrap', { 'list-group': viewMode === 'list' }]">
            <ConnectionCard v-for="connection in filteredConnections" :key="connection.uid" :connection="connection"
                @delete="() => connectionStore.removeConnection(connection.uid)" :view-mode="viewMode" />
        </div>

        <div class="row my-2">
            <!-- Block button to add new connections -->
            <div class="d-grid gap-2 my-2">
                <button class="btn btn-primary" type="button" @click="() => applicationStore.changePage('connections.add')">
                    Add new connection
                    <i class="bi bi-plus-circle-fill"></i>
                </button>
            </div>


        </div>
    </div>
</template>

<script setup lang="ts">
import ConnectionCard from '@/components/ConnectionCard.vue';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { computed, ref } from "vue";


const connectionStore = useConnectionStore();
const applicationStore = useApplicationStore();

const searchTerm = ref('');
const viewMode = ref('list');

const filteredConnections = computed(() => {
    return connectionStore.connections.filter(connection => {
        return connection.name.toLowerCase().includes(searchTerm.value.toLowerCase());
    });
});

</script>

<style scoped></style>
