<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 4.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <li v-for="connection in applicationStore.connections" :key="connection.uid" class="nav-item">
                <a href="javascript://" @click="() => applicationStore.changePage('settings')"
                    class="nav-link py-3 border-bottom rounded-0" :class="{
                        'active': applicationStore.page === 'connections'
                    }" aria-current="page" data-bs-toggle="tooltip" data-bs-placement="right" :aria-label="connection.name"
                    :data-bs-original-title="connection.name">
                    <i class="bi bi-plus-square h2"></i>
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link active py-3 border-bottom rounded-0" aria-current="page"
                    data-bs-toggle="tooltip" data-bs-placement="right" aria-label="View Connections"
                    data-bs-original-title="View Connections">
                    <i class="bi bi-hdd-network h2"></i>
                </a>
            </li>
        </ul>
        <div class="dropdown border-top">
            <a href="javascript://" @click="() => applicationStore.changePage('settings')"
                class="nav-link text-center py-3 border-bottom rounded-0" :class="{
                    'active': applicationStore.page === 'settings'
                }" aria-current="page" data-bs-toggle="tooltip" data-bs-placement="right" aria-label="Settings"
                data-bs-original-title="Settings">
                <i class="bi bi-gear-wide-connected h2"></i>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Tooltip } from 'bootstrap'
import { onMounted } from 'vue';
import { useApplicationStore } from '@/stores/useApplicationStore';

const applicationStore = useApplicationStore();

onMounted(() => {
    new Tooltip(document.body, {
        selector: "[data-bs-toggle='tooltip']",
    });
})
</script>

<style scoped></style>