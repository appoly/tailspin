<template>
    <div>
        <h1>Settings</h1>
        <div class="list-group h-100">
            <!-- Menu item buttons for theme and delete all -->
            <button @click="userStore.toggleTheme" class="btn btn-primary mb-2">
                {{ toggleThemeButton }}
            </button>
            <button @click="deleteAllConfirm" class="btn btn-danger my-2">Delete All Connections</button>
        </div>

        <div class="d-flex justify-content-end">
            <small class="text-muted">Version: {{ version }}</small>
        </div>

    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/useUserStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { computed } from 'vue';
// import { app } from 'electron'
const userStore = useUserStore();
const connectionStore = useConnectionStore();

const currentTheme = computed(() => {
    return userStore.theme;
});

const toggleThemeButton = computed(() => {
    return currentTheme.value == 'light' ? 'Dark Mode' : 'Light Mode';
});

// get the version from the package.json file
const version = computed(() => {
    // APP_VERSION is defined in the vite config
    return APP_VERSION;
});

function deleteAllConfirm() {
    if (confirm('Are you sure you want to delete all connections?')) {
        connectionStore.deleteAllConnections();
    }
}

</script>

<style scoped></style>