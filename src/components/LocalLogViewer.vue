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
                                <option disabled value=''>Please select an option...</option>
                                <option v-for="path in paths" :value="connection.path + '/' + path">{{ path }}</option>
                            </select>

                        </template>
                    </template>
                </div>
                <div class="ms-2">
                    <button v-if="isDirectory" class="btn btn-outline-secondary me-2" type="button" @click="goToFolder">
                        <i class="bi bi-folder"></i>
                        <span class="visually-hidden">Open Folder</span>
                    </button>
                    <button class="btn btn-outline-secondary" type="button" @click="refreshLog"
                        :disabled="isLoading || !currentPath">
                        <i class="bi bi-arrow-clockwise"></i>
                        <span class="visually-hidden">Refresh Log</span>
                    </button>
                </div>
            </div>
        </div>
        <div>
            <TheLogViewer :logEntries="logEntries" :isLoading="isLoading" :errorMsg="errorMsg"
                :key="`log_viewer_${currentPath}`" />

            <template v-if="!isLoading && !errorMsg && !logEntries.length">

                <div v-if="paths.length && !currentPath" class="my-2">
                    <div class="alert alert-info" role="alert">
                        Please select a file from the dropdown above.
                    </div>
                </div>

            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { Connection, LogEntry } from "$/interfaces";
import { useLogParser } from "@/composables/useLogParser";
import TheLogViewer from "@/components/TheLogViewer.vue";

const props = defineProps<{
    connection: Connection;
}>();

onMounted(() => {
    readLog(props.connection.path);
});

const logEntries = ref<LogEntry[]>([]);
const isLoading = ref(false);
const errorMsg = ref('');

const paths = ref<string[]>([]);
const isDirectory = ref<boolean>(false);
const currentPath = ref('');

async function handlePathDropdown() {
    nextTick(() => readLog(currentPath.value));
}

async function readLog(path: string) {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const contentType = await api.Application.isFileOrDirectory(path);
        if (!contentType) {
            throw new Error("File not found");
        }

        if (contentType === 'directory') {
            isDirectory.value = true;
            paths.value = (await api.Application.getFilesInDirectory(path)).sort().reverse();
            return;
        }

        currentPath.value = path;
        const fileContent = await api.Application.readFromPath(path);
        logEntries.value = await useLogParser(fileContent);
    } catch (error: any) {
        errorMsg.value = error?.message ?? "Error reading log file";
    } finally {
        isLoading.value = false;
    }
}

function refreshLog() {
    if (currentPath.value) {
        readLog(currentPath.value);
    }
}

function goToFolder() {
    try {
        api.Application.openFolderFromPath(props.connection.path);
    } catch (error: any) {
        alert(error?.message ?? 'Error opening folder');
    }
}

</script>