<template>
    <div class="h-100 d-flex flex-column justify-content-between">
        <div>
            <h1>Settings</h1>
            <div>
                <div class="d-flex flex-column my-4">
                    <h2 class="h4">User Settings</h2>
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
                <h2 class="h4">SSH</h2>
                <TheDefaultKeyPathForm class="mb-2" />
                <TheNumberOfLinesOnSshForm class="mb-2" />
                <hr />
                <h2 class="h4">Laravel Forge</h2>
                <TheForgeApiKeyForm class="mt-2 mb-3" />
                <hr />
            </div>
        </div>
        <!-- bottom -->
        <div class="mt-5 mb-2">
            <div class="mb-1 d-flex gap-3">
                <button @click="deleteAllConnections" class="col btn btn-outline-danger">Delete All Connections</button>
                <button @click="deleteAllConfirm" class="col btn btn-danger">Delete All Config Data</button>
            </div>
            <div class="d-flex justify-content-center mb-1">
                <small class="text-muted">Version: {{ version }}</small>
            </div>
        </div>
        <GenericBootstrapModal ref="modal">
            <div v-if="deleting" class="d-flex justify-content-center">
                <div class="spinner-border text-danger" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                Please wait...
            </div>
        </GenericBootstrapModal>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useUserStore } from '@/stores/useUserStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { useApplicationStore } from '@/stores/useApplicationStore';
import TheForgeApiKeyForm from '@/components/settings/TheForgeApiKeyForm.vue';
import TheDefaultKeyPathForm from '@/components/settings/TheDefaultKeyPathForm.vue';
import TheNumberOfLinesOnSshForm from '@/components/settings/TheNumberOfLinesOnSshForm.vue';
import GenericBootstrapModal from '@/components/GenericBootstrapModal.vue';
const userStore = useUserStore();
const connectionStore = useConnectionStore();
const applicationStore = useApplicationStore();

const selectedTheme = computed({
    get: () => userStore.theme,
    set: (val) => userStore.changeTheme(val),
});
// get the version from the package.json file
const version = ref(APP_VERSION);
// APP_VERSION is defined in the vite config

const deleting = ref(false);
const modal = ref();

function deleteAllConnections() {
    if (confirm('Are you sure you want to delete all connections?')) {
        connectionStore.deleteAllConnections();
    }
}

async function deleteAllConfirm() {
    if (confirm('Are you sure you want to delete all connections?')) {
        deleting.value = true;
        modal.value!.open();
        try {
            await applicationStore.deleteAllConfigData();
            alert('All config data has been deleted. App will now reload.');
            location.reload();
        } catch (error) {
            alert('Error deleting config data.');
        }
    }
}
</script>