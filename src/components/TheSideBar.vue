<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 4.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <!-- Example for now, a standard log viewer page -->
            <SidebarItem key="log-viewer" label="Log Viewer" icon="bi bi-book" tooltip="Log Viewer"
                :active="applicationStore.page === 'log-viewer'" :pageId="'log-viewer'"
                @setPage="() => applicationStore.changePage('log-viewer')" />


            <li v-for="connection in applicationStore.openConnections" :key="connection.uid" class="nav-item">
                <SidebarItem :key="connection.uid" :label="connection.name" icon="bi bi-hdd-network"
                    :tooltip="connection.name" :active="applicationStore.page === 'connections'" :pageId="connection.uid"
                    @setPage="() => applicationStore.changePage('connection.page.' + connection.uid)" />
            </li>
            <li class="nav-item">
                <SidebarItem key="connections" label="View Connections" icon="bi bi-hdd-network" tooltip="View Connections"
                    :active="applicationStore.page === 'connections'" pageId="connections"
                    @setPage="() => applicationStore.changePage('connections')" />
            </li>
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

const applicationStore = useApplicationStore();

onMounted(() => {
    new Tooltip(document.body, {
        selector: "[data-bs-toggle='tooltip']",
    });
})
</script>

<style scoped></style>