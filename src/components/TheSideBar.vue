<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 4.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <!-- Example for now, a standard log viewer page -->
            <SidebarItem key="log-viewer" label="View By File" icon="bi bi-book" tooltip="View By File"
                :active="applicationStore.page === 'log-viewer'" :pageId="'log-viewer'"
                @setPage="() => applicationStore.changePage('log-viewer')" />

            <SidebarItem key="connections" label="View Connections" icon="bi bi-hdd-network" tooltip="View Connections"
                :active="applicationStore.page === 'connections'" pageId="connections"
                @setPage="() => applicationStore.changePage('connections')" />

            <li v-for="connection in connectionStore.openConnections" :key="connection.uid" class="nav-item">
                <SidebarItem :key="connection.uid" :label="connection.name" :icon="`bi bi-${connection.icon}`"
                    :tooltip="connection.name" :active="applicationStore.page === 'connections.page.' + connection.uid"
                    :pageId="connection.uid"
                    @setPage="() => applicationStore.changePage('connections.page.' + connection.uid)" />
            </li>
            ah
        </ul>
        <div class="nav nav-pills nav-flush flex-column text-center border-top">
            <SidebarItem key="settings" label="Settings" icon="bi bi-gear-wide-connected" tooltip="Settings"
                :active="applicationStore.page === 'settings'" pageId="settings"
                @setPage="() => applicationStore.changePage('settings')" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { Tooltip } from 'bootstrap'
import { onMounted } from 'vue';
import { useApplicationStore } from '@/stores/useApplicationStore';
import SidebarItem from './SidebarItem.vue';
import { useConnectionStore } from '@/stores/useConnectionStore';

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

onMounted(() => {
    new Tooltip(document.body, {
        selector: "[data-bs-toggle='tooltip']",
    });
})
</script>

<style scoped></style>