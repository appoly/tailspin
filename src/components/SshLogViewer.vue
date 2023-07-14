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
                                <option v-for="file in files" :value="file.path">
                                    {{ getLastPathSegment(file.path) }} ({{ kilobytesToHumanReadableFileSize(file.size) }})
                                </option>
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
                    <button class="btn btn-outline-secondary" type="button" @click="() => readLog(props.connection.path)"
                        :disabled="!isReady">
                        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
                        <span class="visually-hidden">Refresh</span>
                    </button>
                </div>
            </div>
        </div>
        <div>
            <TheLogViewer :logEntries="logEntries" :isLoading="isLoading" :errorMsg="errorMsg" ref="theLogViewer"
                :key="`log_viewer_${currentPath}`">
                <template #additional-filters>
                    <div class="ms-2">
                        <button class="btn btn-primary" @click="() => showSshOptions = !showSshOptions">
                            SSH Options&nbsp;
                            <i v-if="!showSshOptions" class="bi bi-chevron-down"></i>
                            <i v-else class="bi bi-chevron-up"></i>
                        </button>
                    </div>
                </template>

                <template #above-table>
                    <Transition>
                        <TheLogViewerSshOptions v-show="showSshOptions" v-model="sshOptions" :originalOptions="sshOptions"
                            :isLoading="isLoading" :currentFileSize="currentFileSize" @submitted="handleOptionsUpdate" />
                    </Transition>
                </template>
            </TheLogViewer>

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
import { ref, onMounted, nextTick, computed, watch } from "vue";
import { Connection, LogEntry, SshOptions } from "$/interfaces";
import { useLogParser } from "@/composables/useLogParser";
import { unproxify } from "@/helpers";
import { useApplicationStore } from "@/stores/useApplicationStore";
import TheSshPassphraseModal from "./TheSshPassphraseModal.vue";
import TheLogViewer from "@/components/TheLogViewer.vue";
import TheLogViewerSshOptions from "@/components/TheLogViewerSshOptions.vue";
import { kilobytesToHumanReadableFileSize } from "@/helpers";
import { MaxFileSizeToLoadKb } from "@/constants/Ssh";

const props = defineProps<{
    connection: Connection;
}>();

onMounted(async () => {
    readLog(props.connection.path);
    sshOptions.value.numberOfKilobytes = Number(await api.Store.get('ssh.numberOfKilobytes', 1000));
});

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

const sshOptions = ref<SshOptions>({
    numberOfKilobytes: 1000,
});
const isDirectory = ref<boolean>(false);
const currentPath = ref('');
const files = ref<{ size: number, path: string }[]>([]);
const paths = computed(() => {
    return files.value.map((file) => file.path);
});
const currentFileSize = ref(0);
const currentFile = computed(() => {
    return files.value.find((file) => file.path === currentPath.value);
});

const showSshOptions = ref(false);

const isReady = computed(() => !isLoading.value && currentPath.value && !downloading.value);
const theLogViewer = ref();

function handleOptionsUpdate() {
    if (currentPath.value) {
        readLog(currentPath.value);
        // Reset the page to 1 by making use of the exposed `page` variable on TheLogViewer:
        theLogViewer.value.changePage(1);
    }
}
async function readLog(path: string) {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        // If the number of lines is set to 0 (ie. unlimited) and the file is larger than the max, abort:
        if (sshOptions.value.numberOfKilobytes === 0 && currentFile.value!.size > MaxFileSizeToLoadKb) {
            throw new Error('File too large to retrieve all lines. Please select a limited number of lines.');
        }
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

        let data: { success: boolean, message?: string, fileSize?: string };

        if (contentType.message.trim() === 'directory') {
            isDirectory.value = true;
            data = await api.Ssh.getFilesInDirectory(unproxify(sshConfig.value), path);

            if (!data.success) {
                throw new Error(data.message);
            }
            // We have back each file with first its size, then its name. Below, we'll extract these into an array with 2 elements: size and path:
            files.value = (data.message as string).trim().split('\n').map((file: string) => {
                const [size, ...path] = file.trim().split(' ');
                return {
                    size: parseInt(size),
                    path: path.join(' ')
                }
            });
            return;
        };

        currentPath.value = path;
        data = await api.Ssh.readFromPath(unproxify(sshConfig.value), path, sshOptions.value.numberOfKilobytes)


        if (!data.success) {
            throw new Error(data.message);
        }
        logEntries.value = await useLogParser(data.message as string);
        currentFileSize.value = parseInt(data.fileSize as string);
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
