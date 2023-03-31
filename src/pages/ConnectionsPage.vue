<template>
    <div>
        <div class="d-flex">
            <h1>Connections</h1>
            <span class="ms-2 align-self-center">
                <i role="button" @click="() => applicationStore.changePage('connections.add')"
                    class="bi bi-plus-circle-fill"></i>
            </span>
        </div>

        <small v-if="hasNoConnections" class="text-muted">
            You don't have any connections yet. Click the button above to add a new connection.
        </small>

        <template v-else>
            <!-- search for a connection -->
            <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="Search for a connection" v-model="searchTerm" />
            </div>

            <!-- Buttons to toggle between list and grid view -->
            <div class="d-flex justify-content-end">
                <i role="button" :class="['h3 bi bi-list', { 'selected': viewMode === 'list' }]"
                    @click="() => viewMode = 'list'"></i>
                <i role="button" :class="['h3 bi bi-grid', { 'selected': viewMode === 'grid' }]"
                    @click="() => viewMode = 'grid'"></i>
            </div>

            <h2>Favorite Connections</h2>
            <small class="text-muted" v-if="favoriteConnections.length == 0">
                You don't have any favorite connections yet. Right click on a connection to add it to your favorites.
            </small>
            <div :class="['d-flex flex-wrap', { 'list-group': viewMode === 'list' }]">
                <ConnectionCard v-for="connection in filteredFavoriteConnections" :key="connection.uid"
                    :connection="connection" @delete="() => connectionStore.removeConnection(connection.uid)"
                    :view-mode="viewMode" />
            </div>

            <hr />
            <div :class="['d-flex flex-wrap', { 'list-group': viewMode === 'list' }]">
                <ConnectionCard v-for="connection in filteredNonFavoriteConnections" :key="connection.uid"
                    :connection="connection" @delete="() => connectionStore.removeConnection(connection.uid)"
                    :view-mode="viewMode" />
            </div>

            <div class="row my-2">
                <!-- Block button to add new connections -->
                <div class="d-grid gap-2 my-2">
                    <button class="btn btn-primary" type="button"
                        @click="() => applicationStore.changePage('connections.add')">
                        Add new connection
                        <i class="bi bi-plus-circle-fill"></i>
                    </button>
                </div>
            </div>
        </template>
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

const favoriteConnections = computed(() => {
    return connectionStore.connections.filter(connection => connection.isFavorite);
});

const nonFavoriteConnections = computed(() => {
    return connectionStore.connections.filter(connection => !connection.isFavorite);
});

const filteredFavoriteConnections = computed(() => {
    return favoriteConnections.value.filter(connection => connection.name.toLowerCase().includes(searchTerm.value.toLowerCase()));
});

const filteredNonFavoriteConnections = computed(() => {
    return nonFavoriteConnections.value.filter(connection => connection.name.toLowerCase().includes(searchTerm.value.toLowerCase()));
});

const hasNoConnections = computed(() => {
    return connectionStore.connections.length == 0;
});

</script>

<style scoped></style>
