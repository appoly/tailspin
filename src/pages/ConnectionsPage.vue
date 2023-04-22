<template>
    <div>
        <div class="d-flex">
            <h1>Connections</h1>
            <span class="ms-2 align-self-center">
                <div class="add-new-button" @click="() => applicationStore.changePage('connections.add')">
                    <i class="bi bi-plus-lg hoverable"></i>
                </div>
            </span>
        </div>

        <div class="input-group mb-3">
            <SearchBar placeholder="Search for a connection" v-model:search-term="searchTerm" />
        </div>

        <small v-if="hasNoConnections" class="text-muted">
            You don't have any connections yet. Click the button above to add a new connection.
        </small>

        <template v-else-if="searchTerm == ''">
            <!-- search for a connection -->


            <h2>Favorite Connections</h2>
            <small class="text-muted" v-if="favoriteConnections.length == 0">
                You don't have any favorite connections yet. Right click on a connection to add it to your favorites.
            </small>
            <div :class="['d-flex flex-wrap']">
                <ConnectionCard v-for="connection in favoriteConnections" :connection="connection"
                    @delete="() => connectionStore.removeConnection(connection.uid)" view-mode="grid" />
            </div>

            <hr />

            <h2>All Connections</h2>
            <div :class="['d-flex flex-wrap', { 'list-group': viewMode === 'list' }]">
                <draggable v-model="allConnections" @start="drag = true" @end="drag = false"
                    item-key="uid">
                    <template #item="{ element }">
                        <span>
                            <ConnectionCard :connection="element"
                                @delete="() => connectionStore.removeConnection(element.uid)" view-mode="list" />
                        </span>
                    </template>
                </draggable>
            </div>

        </template>
        <template v-else>
            <!-- Search results -->
            <h2>Search Results</h2>
            <div :class="['d-flex flex-wrap', { 'list-group': viewMode === 'list' }]" v-if="filteredConnections.length > 0">
                <ConnectionCard v-for="connection in filteredConnections" :connection="connection"
                    @delete="() => connectionStore.removeConnection(connection.uid)" view-mode="list" />
            </div>
            <small v-else class="text-muted">
                No connections found.
            </small>
        </template>
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
import SearchBar from '@/components/SearchBar.vue';
import draggable from 'vuedraggable'


const connectionStore = useConnectionStore();
const applicationStore = useApplicationStore();

const searchTerm = ref('');
const viewMode = ref('list');
const drag = ref(false);

// all connections get and set from the store
const allConnections = computed({
    get: () => connectionStore.connections,
    set: (val) => connectionStore.reorderConnections(val)
});

const favoriteConnections = computed(() => {
    // filter and sort favorite connections
    return connectionStore.connections.filter(connection => connection.isFavorite).sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        } else {
            return 0;
        }
        return 0;
    });
});

const filteredConnections = computed(() => {
    // filter connections by search term
    return connectionStore.connections.filter(connection => {
        return connection.name.toLowerCase().includes(searchTerm.value.toLowerCase());
    });
});

const hasNoConnections = computed(() => {
    return connectionStore.connections.length == 0;
});

</script>

<style scoped></style>
