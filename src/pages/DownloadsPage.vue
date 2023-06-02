<template>
    <div class="h-100">
        <div>
            <div class="d-flex">
                <h1>Downloads</h1>
                <span class="ms-2 align-self-center">
                    <div class="add-new-button" @click="goToDownloads">
                        <i class="bi bi-folder"></i>
                        <span class="visually-hidden">Open Folder</span>
                    </div>
                </span>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Date</th>
                        <th><i class="bi bi-wrench"></i></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="applicationStore.downloads.length === 0">
                        <td colspan="3" class="text-center">No Entries</td>
                    </tr>
                    <tr v-for="download in applicationStore.downloads.sort((a, b) => b.date.getTime() - a.date.getTime())"
                        :key="download.name">
                        <td>{{ download.name }}</td>
                        <td>{{ download.date.toLocaleString() }}</td>
                        <td>
                            <template v-if="download.type === 'inProgress'">
                                <div class=" spinner-border" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </template>
                            <template v-else-if="download.type === 'completed'">
                                <button @click="() => openFolderToFile(download.name)" class="btn">
                                    <i class="bi bi-folder"></i>
                                    <span class="visually-hidden">Open Folder</span>
                                </button>
                            </template>
                            <template v-else>
                                <span class="badge bg-danger">Failed</span>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
const applicationStore = useApplicationStore();

async function openFolderToFile(file: string) {
    try {
        await api.Application.openFolderToFile(file);
    } catch (error) {
        alert(error)
    }
}

async function goToDownloads() {
    try {
        let error = await api.Application.openDownloadsFolder();
        if (error) {
            throw new Error(error);
        }
    } catch (error) {
        alert(error)
    }
}

</script>