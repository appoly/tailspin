<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 4.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <li v-for="connection in applicationStore.connections" :key="connection.uid" class="nav-item">
                <a href="javascript://" @click="() => applicationStore.changePage('settings')"
                    class="nav-link py-3 border-bottom rounded-0" :class="{
                        'active': applicationStore.page === 'connections'
                    }" aria-current="page" data-bs-toggle="tooltip" data-bs-placement="right"
                    :aria-label="connection.name" :data-bs-original-title="connection.name">
                    <i class="bi bi-plus-square h2"></i>
                </a>
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