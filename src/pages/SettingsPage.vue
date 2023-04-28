<template>
    <div class="h-100 d-flex flex-column justify-content-between">
        <div>
            <h1>Settings</h1>
            <div class="d-flex flex-column">
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

                <div class="form-group my-4">
                    <label for="forge-api-key">
                        Forge API Key
                    </label>
                    <textarea type="text" class="form-control" id="forge-api-key" placeholder="Forge API Key">  </textarea>
                    <small class="text-muted">
                        We can pull your sites from Forge using an API key. You can create one <a
                            href="https://forge.laravel.com/user-profile/api" target="_blank">here</a>.
                    </small>
                </div>

                <div class="form-group">
                    <label for="default-ssh-key-path">
                        Default SSH Key Path
                    </label>
                    <form @submit.prevent="handleSshKeyPathSubmit">
                        <div class="input-group">
                            <button @click.prevent="() => handlePathSelection('file')" class="btn btn-outline-secondary"
                                type="button">Browse</button>
                            <input type="text" class="form-control" id="default-ssh-key-path" v-model="sshKeyPath"
                                placeholder="Default SSH Key Path">
                            <button class="btn btn-secondary" type="submit">Submit</button>
                        </div>
                    </form>
                </div>
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
import { computed, ref, watch } from 'vue';
// import { app } from 'electron'
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

async function handlePathSelection(type: 'file' | 'folder') {
    const result = await api.Application.openFileDialogue({ properties: [type === 'file' ? 'openFile' : 'openDirectory'] });
    if (result.filePaths[0]) {
        console.log(result.filePaths[0]);
    }
}

</script>

<style scoped></style>