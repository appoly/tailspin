<template>
    <div>
        <div class="mt-2 mb-4">
            <div class="d-flex">
                <div class="w-100">
                    <div class="input-group mb-3">
                        <input ref="logInput" id="logFile" type="file" class="form-control" @change="handleFileSelect" />
                    </div>
                </div>
                <div class="ms-2">
                    <button class="btn btn-outline-secondary" type="button" @click="refreshLog" :disabled="isLoading">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
            </div>
        </div>
        <TheLogViewer :logEntries="logEntries" :isLoading="isLoading" errorMsg="" />
    </div>
</template>
  
<script setup lang="ts">
import { ref } from "vue";
import { LogEntry } from "@/interfaces";
import { useLogParser } from "@/composables/useLogParser";
import TheLogViewer from "@/components/TheLogViewer.vue";

const logInput = ref<HTMLInputElement | null>(null);
const logEntries = ref<LogEntry[]>([]);
const isLoading = ref(false);

async function handleFileSelect(evt: any) {
    const files = evt.target.files; // FileList object
    const file = files[0];
    const filePath = file.path;
    // Get file size:
    const fileSize = file.size;
    // If file size is larger than 500Mb, show error message and return
    if (fileSize > 500000000) {
        let fileSizeInMb = Math.round(fileSize / 1000000);
        alert(`File size of ${fileSizeInMb} is too large. Please select a file smaller than 500Mb.`);
        return;
    }

    readLog(filePath);
}

async function readLog(path: string) {
    isLoading.value = true;
    const fileContent = await content(path);
    logEntries.value = await useLogParser(fileContent);
    isLoading.value = false;
}

async function content(path: string): Promise<string> {
    return await api.Application.readFromPath(path);
}
interface FileWithPath extends File {
    path: string
}

function refreshLog() {
    // get log file path from input field using ref
    const files = logInput.value?.files;
    const file = files ? files[0] : null;
    const filePath = file ? (file as FileWithPath).path : null;
    if (filePath !== null) {
        readLog(filePath);
    }
}
</script>
  