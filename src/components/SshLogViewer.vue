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
                            <select v-else class="form-select" v-model="currentPath" @change="handlePathDropdown"
                                :disabled="downloading || isLoading">
                                <option disabled value=''>Please select an option...</option>
                                <option v-for="path in paths" :value="path">{{ getLastPathSegment(path) }}</option>
                            </select>

                        </template>
                    </template>
                </div>
                <div class="ms-2">
                    <button class="btn btn-outline-secondary me-2" type="button" @click="() => downloadLog()"
                        :disabled="!isReady">
                        <i class="bi bi-download" aria-hidden="true"></i>
                        <span class="visually-hidden">Download</span>
                    </button>
                    <button class="btn btn-outline-secondary" type="button" @click="refreshLog" :disabled="!isReady">
                        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
                        <span class="visually-hidden">Refresh</span>
                    </button>
                </div>
            </div>
        </div>
        <div>
            <TheLogViewer :logEntries="logEntries" :isLoading="isLoading" :errorMsg="errorMsg"
                :key="`log_viewer_${currentPath}`" />

            <div v-if="paths.length && !currentPath" class="my-2">
                <div class="alert alert-info" role="alert">
                    Please select a file from the dropdown above.
                </div>
            </div>
            <template v-if="isReady">
                <div v-if="!paths.length" class="my-2">
                    <div class="alert alert-info" role="alert">
                        <div class="d-flex justify-content-between align-items-center">
                            No log entries found.
                            <button class="btn btn-outline-light" type="button" @click="retryConnection">Reload?</button>
                        </div>
                    </div>
                </div>

            </template>
        </div>
        <Teleport to="body">
            <TheSshPassphraseModal v-model="passphrase" ref="passphraseModal" @submit="handlePassphraseSubmit" />
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import { Connection, LogEntry } from "@/interfaces";
import { useLogParser } from "@/composables/useLogParser";
import TheLogViewer from "./TheLogViewer.vue";
import { unproxify } from "@/helpers";
import TheSshPassphraseModal from "./TheSshPassphraseModal.vue";
import { useApplicationStore } from "@/stores/useApplicationStore";

const props = defineProps<{
    connection: Connection;
}>();

const applicationStore = useApplicationStore();

const passphrase = ref<string | null>(null);
const passphraseModal = ref();
const sshConfig = computed(() => ({
    ...props.connection.ssh,
    ...(props.connection.ssh?.passphraseRequired ? { passphrase: passphrase.value } : {})
}))

const logEntries = ref<LogEntry[]>([]);
const isLoading = ref(false);
const errorMsg = ref('');

const paths = ref<string[]>([]);
const isDirectory = ref<boolean>(false);
const currentPath = ref('');

const isReady = computed(() => !isLoading.value && currentPath.value && !downloading.value);

onMounted(async () => {
    readLog(props.connection.path);
});

async function readLog(path: string) {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        if (props.connection.ssh?.passphraseRequired && !passphrase.value) {
            passphraseModal.value!.open();
            return;
        }
        const contentType: { success: boolean, message?: string } = await api.Ssh.isFileOrDirectory(unproxify(sshConfig.value), path);

        if (!contentType.success) {
            throw new Error(contentType.message);
        }

        if (!contentType.message) {
            throw new Error("Path not valid");
        }

        let data: { success: boolean, message?: string };

        if (contentType.message.trim() === 'directory') {
            isDirectory.value = true;
            data = await api.Ssh.getFilesInDirectory(unproxify(sshConfig.value), path);
            if (!data.success) {
                throw new Error(data.message);
            }
            paths.value = (data.message as string).trim().split('\n').sort().reverse();
            return;
        };

        currentPath.value = path;
        data = await api.Ssh.readFromPath(unproxify(sshConfig.value), path)
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

const downloading = ref(false);

async function downloadLog() {
    /**
     * TODO
     * We either want to:
     * 1. Block EVERYTHING whilst this is running, including changing pages
     * 2. Send it to a queue instead of awaiting
     */
    downloading.value = true;
    try {
        // Let the file name be the concatenation of the connection name and the file name, made safe for file systems:

        // For the connection name, we want to remove all whitespace and non-alphanumeric characters, and make it lowercase:
        let connectionName = props.connection.name.trim().replace(/[\s]/gi, '').replace(/[^\w\-]/gi, '_').toLowerCase();

        // For the filename, firstly, we only want the bit after the final '/':
        let fileName = currentPath.value.split('/').slice(-1)[0];

        // Then drop the .log extension, make safe, and then add it back on:
        fileName = fileName.replace(/\.log$/i, '').replace(/[^\w\-]/gi, '_').toLowerCase() + '.log';

        // Prepend 'log' to avoid any issues where the file name starts with non-alphanumeric characters:
        fileName = 'log-' + connectionName + '-' + fileName;

        // The max character limit on file names is 255, so we need to truncate it if it's too long, still keeping .log on the end:
        if (fileName.length > 255) {
            fileName = fileName.slice(0, 255 - 4) + '.log';
        }

        if (!applicationStore.updateDownloads(fileName, 'inProgress')) {
            throw new Error("Download already in progress");
        }
        const data = await api.Ssh.downloadFromPath(unproxify(sshConfig.value), currentPath.value, fileName ?? 'Log');

        if (!data.success) {
            applicationStore.updateDownloads(fileName, 'failed');
            throw new Error(data.message);
        } else {
            applicationStore.updateDownloads(fileName, 'completed');
        }
    } catch (error: any) {
        alert(error?.message ?? "Error downloading log file");
    } finally {
        downloading.value = false;
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

function handlePassphraseSubmit() {
    readLog(currentPath.value || props.connection.path);
}

function retryConnection() {
    readLog(currentPath.value || props.connection.path);
}

function getLastPathSegment(path: string) {
    return path.split('/').pop();
}

</script>
