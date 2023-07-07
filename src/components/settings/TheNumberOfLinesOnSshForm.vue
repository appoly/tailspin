<template>
    <div class="form-group">
        <label for="ssh-number-of-lines">
            SSH - Default Number of Lines
        </label>
        <form @submit.prevent="submit">
            <div class="input-group">
                <select class="form-select" v-model.number="numberOfLines" @change="hasChanged = true"
                    id="ssh-number-of-lines">
                    <option value="1000">{{ Number(1000).toLocaleString() }}</option>
                    <option value="10000">{{ Number(10000).toLocaleString() }}</option>
                    <option value="50000">{{ Number(50000).toLocaleString() }}</option>
                    <option value="100000">{{ Number(100000).toLocaleString() }}</option>
                    <option value="200000">{{ Number(200000).toLocaleString() }}</option>
                </select>
                <button class="btn btn-secondary" type="submit" :disabled="isLoading || !hasChanged">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span v-else>Save</span>
                </button>
            </div>
            <small class="text-muted">
                This is the number of lines that will be requested from the log. A larger number will take longer to load,
                but provide more log entries.
            </small>
            <div v-if="errMsg">
                <small class="text-danger">{{ errMsg }}</small>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const numberOfLines = ref(1000);
const isLoading = ref(false);
const errMsg = ref('');
const hasChanged = ref(false);

onMounted(() => {
    getExistingKeyPath();
});

async function getExistingKeyPath() {
    isLoading.value = true;
    try {
        numberOfLines.value = parseInt(await api.Store.get('ssh.numberOfLines', 1000));
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error getting existing key path";
    } finally {
        isLoading.value = false;
    }
}

async function submit() {
    isLoading.value = true;
    try {
        await api.Store.set('ssh.numberOfLines', numberOfLines.value);
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error getting existing key path";
    } finally {
        isLoading.value = false;
    }
}
</script>

<style scoped></style>