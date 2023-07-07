<template>
    <div class="h-100 d-flex flex-column justify-content-between">
        <div>
            <h1>Settings</h1>
            <div>
                <div class="d-flex flex-column my-4">
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
                </div>
                <hr />
                <TheDefaultKeyPathForm />
                <hr />
                <TheNumberOfLinesOnSshForm />
                <hr />
                <TheForgeApiKeyForm />
                <hr />
            </div>
        </div>
        <!-- bottom -->
        <div class="mt-5 mb-2">
            <div class="mb-1">
                <button @click="deleteAllConfirm" class="btn btn-danger w-100">Delete All Connections</button>
            </div>
            <div class="d-flex justify-content-center mb-1">
                <small class="text-muted">Version: {{ version }}</small>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/useUserStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { computed } from 'vue';
import TheDefaultKeyPathForm from '@/components/settings/TheDefaultKeyPathForm.vue';
import TheForgeApiKeyForm from '@/components/settings/TheForgeApiKeyForm.vue';
import TheNumberOfLinesOnSshForm from '@/components/settings/TheNumberOfLinesOnSshForm.vue';
const userStore = useUserStore();
const connectionStore = useConnectionStore();

const selectedTheme = computed({
    get: () => userStore.theme,
    set: (val) => userStore.changeTheme(val),
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