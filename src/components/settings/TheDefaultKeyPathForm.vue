<template>
    <div class="form-group my-4">
        <label for="default-ssh-key-path">
            Default SSH Key Path
        </label>
        <form @submit.prevent="handleSshKeyPathSubmit">
            <div class="input-group">
                <button @click.prevent="handlePathSelection" class="btn btn-outline-secondary" type="button">Browse</button>
                <input type="text" class="form-control" id="default-ssh-key-path" v-model="sshKeyPath"
                    @input="() => hasChanged = true" placeholder="Default SSH Key Path">
                <button class="btn btn-danger" v-if="hasChanged" type="button" @click="getExistingKeyPath"
                    :disabled="isLoading">
                    <span>Cancel</span>
                </button>
                <button class="btn btn-secondary" type="submit" :disabled="isLoading || !hasChanged">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span v-else>Save</span>
                </button>
            </div>
            <small class="text-muted">
                This is the default SSH key path that will be used when creating new connections.
            </small>
            <div v-if="errMsg">
                <small class="text-danger">{{ errMsg }}</small>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const sshKeyPath = ref('');
const isLoading = ref(false);
const hasChanged = ref(false);
const errMsg = ref('');

onMounted(() => {
    getExistingKeyPath();
});

async function getExistingKeyPath() {
    isLoading.value = true;
    try {
        sshKeyPath.value = await api.Store.get('app.sshKeyPath', '');
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error getting existing key path";
    } finally {
        isLoading.value = false;
    }
}

async function handlePathSelection() {
    const result = await api.Application.openFileDialogue({ properties: ['openFile'] });
    if (result.filePaths[0]) {
        sshKeyPath.value = result.filePaths[0];
        hasChanged.value = true;
    }
}

async function handleSshKeyPathSubmit() {
    isLoading.value = true;
    try {
        await api.Store.set('app.sshKeyPath', sshKeyPath.value);
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error getting existing key path";
    } finally {
        isLoading.value = false;
    }
}
</script>

<style scoped></style>