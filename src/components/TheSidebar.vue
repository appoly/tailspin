<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 3.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <SidebarItem key="log-viewer" label="View By File" icon="bi bi-book" tooltip="View By File"
                :active="applicationStore.page === 'log-viewer'" :pageId="'log-viewer'"
                @setPage="() => applicationStore.changePage('log-viewer')" />
            <SidebarItem v-if="applicationStore.forgeSectionEnabled" key="forge-connections"
                label="Laravel Forge Connections" icon="bi bi-hammer" tooltip="Laravel Forge Connections"
                :active="applicationStore.page === 'connections.forge'" pageId="connections.forge"
                @setPage="() => applicationStore.changePage('connections.forge')" />

            <SidebarItem key="connections" label="View Connections" icon="bi bi-hdd-network" tooltip="View Connections"
                :active="applicationStore.page === 'connections'" pageId="connections"
                @setPage="() => applicationStore.changePage('connections')" />

            <template v-for="connection in connectionStore.openConnections" :key="connection.uid" class="nav-item">
                <SidebarItem :label="connection.name" :icon="`bi bi-${connection.icon}`" :tooltip="connection.name"
                    :active="applicationStore.page === 'connections.page.' + connection.uid" :pageId="connection.uid"
                    @setPage="() => applicationStore.changePage('connections.page.' + connection.uid)">
                    <template #badge>
                        <SidebarItemBadge v-if="applicationStore.autoFetching.connectionId === connection.uid"
                            class="bg-info">
                            <i class="bi bi-arrow-repeat"></i>
                        </SidebarItemBadge>
                    </template>
                </SidebarItem>
            </template>
        </ul>
        <div class="nav nav-pills nav-flush flex-column text-center border-top">
            <SidebarItem key="downloads" label="Downloads" icon="bi bi-download" tooltip="Downloads"
                :active="applicationStore.page === 'downloads'" pageId="downloads"
                @setPage="() => applicationStore.changePage('downloads')">
                <template #badge>
                    <SidebarItemBadge v-if="applicationStore.downloads.filter(d => d.type === 'inProgress').length > 0"
                        class="bg-info">
                        {{ applicationStore.downloads.filter(d => d.type === 'inProgress').length }}
                    </SidebarItemBadge>
                    <SidebarItemBadge class="bg-success"
                        v-if="applicationStore.downloads.filter(d => d.type === 'completed').length > 0">
                        {{ applicationStore.downloads.filter(d => d.type === 'completed').length }}
                    </SidebarItemBadge>
                </template>
            </SidebarItem>
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
import SidebarItem from '@/components/SidebarItem.vue';
import SidebarItemBadge from '@/components/SidebarItemBadge.vue';
import { useConnectionStore } from '@/stores/useConnectionStore';

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

onMounted(() => {
    new Tooltip(document.body, {
        selector: "[data-bs-toggle='tooltip']",
        trigger: 'hover',
    });
})
</script>

<style scoped></style>