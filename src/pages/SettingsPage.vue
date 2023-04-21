<template>
    <div>
        <h1>Settings</h1>
        <div class="list-group h-100">
            <label for="theme-select">Theme</label>
            <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" name="theme-radio" class="btn-check" id="theme-auto" value="auto"
                    v-model="selectedTheme">
                <label class="btn btn-outline-primary" for="theme-auto">Auto (System)</label>

                <input type="radio" name="theme-radio" class="btn-check" id="theme-light" value="light"
                    v-model="selectedTheme">
                <label class="btn btn-outline-primary" for="theme-light">
                    <i class="bi bi-sun"></i> Light
                </label>
                <input type="radio" name="theme-radio" class="btn-check" id="theme-dark" value="dark"
                    v-model="selectedTheme">
                <label class="btn btn-outline-primary" for="theme-dark">
                    <i class="bi bi-moon"></i> Dark
                </label>
            </div>

            <button @click="deleteAllConfirm" class="btn btn-danger my-4">Delete All Connections</button>
        </div>

        <div class="d-flex justify-content-end">
            <small class="text-muted">Version: {{ version }}</small>
        </div>

    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/useUserStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { computed, ref, watch } from 'vue';
// import { app } from 'electron'
const userStore = useUserStore();
const connectionStore = useConnectionStore();

const selectedTheme = ref(userStore.theme);

watch(selectedTheme, (newVal) => {
    userStore.changeTheme(newVal);
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