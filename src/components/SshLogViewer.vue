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
                                <option v-for="path in paths" :value="path">{{ path }}</option>
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
            <div v-if="!isLoading && !errorMsg && !logEntries.length && !paths.length" class="my-2">
                <div class="alert alert-info" role="alert">
                    <div class="d-flex justify-content-between align-items-center">
                        No log entries found.
                        <button class="btn btn-outline-light" type="button"
                            @click="retryConnection">Reload?</button>
                    </div>
                </div>
            </div>
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

const props = defineProps<{
    connection: Connection;
}>();

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
            paths.value = (data.message as string).trim().split('\n');
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

</script>