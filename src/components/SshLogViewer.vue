<template>
    <div>
        <div class="mt-2 mb-4">
            <div class="d-flex mb-3">
                <div class="flex-grow-1">
                    <template v-if="isLoading">
                        <input class="form-control" type="text" value="Loading..." readonly disabled />
                    </template>
                    <template v-else>
                        <input v-if="!isDirectory" class="form-control" type="text" :value="currentPath" readonly
                            disabled />
                        <template v-else>
                            <div v-if="!paths.length">
                                <div class="alert alert-warning" role="alert">
                                    No log files found in this directory.
                                </div>
                            </div>
                            <select v-else class="form-select" v-model="currentPath" @change="handlePathDropdown">
                                <option readonly value=''>Please select an option...</option>
                                <option v-for="path in paths" :value="connection.path + '/' + path">{{ path }}</option>
                            </select>

                        </template>
                    </template>
                </div>
                <div class="ms-2">
                    <button class="btn btn-outline-secondary" type="button" @click="refreshLog"
                        :disabled="isLoading || !currentPath">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
            </div>
        </div>
        <div>
            <TheLogViewer :logEntries="logEntries" :isLoading="isLoading" :errorMsg="errorMsg" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { Connection, LogEntry } from "@/interfaces";
import { useLogParser } from "@/composables/useLogParser";
import TheLogViewer from "./TheLogViewer.vue";
import { unproxify } from "@/helpers";

const props = defineProps<{
    connection: Connection;
}>();

const logEntries = ref<LogEntry[]>([]);
const isLoading = ref(false);
const errorMsg = ref('');

const paths = ref<string[]>([]);
const isDirectory = ref<boolean>(false);
const currentPath = ref('');

onMounted(async () => {
    readLog(props.connection.path);
});

async function readLog(path: string) {
    console.log(path);

    isLoading.value = true;
    errorMsg.value = '';
    try {
        const contentType: { success: boolean, message?: string } = await api.Ssh.isFileOrDirectory(unproxify(props.connection.ssh), path);

        if (!contentType.success) {
            throw new Error(contentType.message);
        }

        if (!contentType.message) {
            throw new Error("Path not valid");
        }

        let data: { success: boolean, message?: string };

        if (contentType.message.trim() === 'directory') {
            isDirectory.value = true;
            data = await api.Ssh.getFilesInDirectory(unproxify(props.connection.ssh), path);
            if (!data.success) {
                throw new Error(data.message);
            }
            paths.value = (data.message as string).trim().split('\n');
            return;
        };

        currentPath.value = path;
        data = await api.Ssh.readFromPath(unproxify(props.connection.ssh), path)
        if (!data.success) {
            throw new Error(data.message);
        }
        logEntries.value = await useLogParser(data.message as string);
        return;
    } catch (error: any) {
        errorMsg.value = error?.message ?? "Error reading log file";
    } finally {
        isLoading.value = false;
    }
}

async function handlePathDropdown() {
    nextTick(() => readLog(currentPath.value));
}

function refreshLog() {
    if (currentPath.value) {
        readLog(currentPath.value);
    }
}

</script>