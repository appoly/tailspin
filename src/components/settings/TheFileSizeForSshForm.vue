<template>
    <div class="form-group">
        <label for="ssh-number-of-lines">
            SSH - Default size to retrieve
        </label>
        <form @submit.prevent="submit">
            <div class="input-group">
                <select class="form-select" v-model.number="numberOfKilobytes" @change="hasChanged = true"
                    id="ssh-number-of-lines">
                    <option v-for="size in FileSizesInKb" :value="size" :key="size">{{
                        kilobytesToHumanReadableFileSize(size) }}
                    </option>
                    <!-- <option value="1000">{{ Number(1000).toLocaleString() }}</option>
                    <option value="10000">{{ Number(10000).toLocaleString() }}</option>
                    <option value="50000">{{ Number(50000).toLocaleString() }}</option>
                    <option value="100000">{{ Number(100000).toLocaleString() }}</option>
                    <option value="200000">{{ Number(200000).toLocaleString() }}</option> -->
                </select>
                <button class="btn btn-secondary" type="submit" :disabled="isLoading || !hasChanged">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span v-else>Save</span>
                </button>
            </div>
            <small class="text-muted">
                This is the
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

const numberOfKilobytes = ref(1000);
const isLoading = ref(false);
const errMsg = ref('');
const hasChanged = ref(false);

onMounted(() => {
    getExistingKeyPath();
});

async function getExistingKeyPath() {
    isLoading.value = true;
    try {
        numberOfKilobytes.value = parseInt(await api.Store.get('ssh.numberOfKilobytes', 1000));
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
        await api.Store.set('ssh.numberOfKilobytes', numberOfKilobytes.value);
        hasChanged.value = false;
    } catch (error: any) {
        errMsg.value = error.message ?? "Error Submitting Form";
    } finally {
        isLoading.value = false;
    }
}
</script>

<style scoped></style>