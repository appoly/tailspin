<template>
    <div class="form-group">
        <label for="ssh-number-of-lines">
            SSH - Default size to retrieve
        </label>
        <form @submit.prevent="submit">
            <div class="input-group">
                <select class="form-select" v-model.number="numberOfBytes" @change="hasChanged = true"
                    id="ssh-number-of-lines">
                    <option v-for="size in FileSizesInKb" :value="size * 1024" :key="size">
                        {{ kilobytesToHumanReadableFileSize(size) }}
                    </option>
                </select>
                <button class="btn btn-secondary" type="submit" :disabled="isLoading || !hasChanged">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span v-else>Save</span>
                </button>
            </div>
            <small class="text-muted">
                This is the default amount of the file that will be retrieved when viewing the log, from the end of the
                file. A larger value will give more entries, but take longer to load.
            </small>
            <div v-if="errMsg">
                <small class="text-danger">{{ errMsg }}</small>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { FileSizesInKb } from "@/constants/Ssh";
import { kilobytesToHumanReadableFileSize } from "@/helpers";

const numberOfBytes = ref(1000);
const isLoading = ref(false);
const errMsg = ref('');
const hasChanged = ref(false);

onMounted(() => {
    getExistingKeyPath();
});

async function getExistingKeyPath() {
    isLoading.value = true;
    try {
        numberOfBytes.value = parseInt(await api.Store.get('ssh.numberOfBytes', 500 * 1024));
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
        await api.Store.set('ssh.numberOfBytes', numberOfBytes.value);
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error Submitting Form";
    } finally {
        isLoading.value = false;
    }
}
</script>

<style scoped></style>