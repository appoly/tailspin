<template>
    <div>
        <div class="d-flex flex-wrap justify-content-between w-100">
            <h1>{{ connection.name }}</h1>
            <span>
                <button @click="() => closeConnection(connection.uid)" class="btn btn-outline-danger btn-sm">Close</button>
            </span>
        </div>
        <div v-if="isLoading" class="alert alert-info">
            Loading...
        </div>
        <div v-else>
            <div v-if="errorMsg" class="alert alert-danger">
                {{ errorMsg }}
            </div>
            <pre>{{ content }}</pre>
            <div v-if="isDirectory">
                <div v-for="file in filesInDirectory" class="alert alert-info">
                    {{ file }}
                </div>
            </div>
            <LocalLogViewer v-if="!isSsh" :connection="connection" />
            <!-- <SshLogViewer v-else :connection="connection" /> -->
            <!-- <TheLogViewer :connection="connection" /> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import LocalLogViewer from '@/components/LocalLogViewer.vue';
import TheLogViewer from '@/components/TheLogViewer.vue';
import { unproxify } from '@/helpers';
import { Connection } from '@/interfaces';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { nextTick, onMounted, ref } from 'vue';

const props = defineProps<{
    connection: Connection;
}>();

const isLoading = ref(false);
const errorMsg = ref('');
const isSsh = ref(false);
const content = ref('');
const filesInDirectory = ref<string[]>([]);
const isDirectory = ref(false);

onMounted(async () => {
    isSsh.value = props.connection.type === 'remote';
    isLoading.value = true;
    try {
        if (isSsh.value) {
            const contentType: { success: boolean, message?: string } = await api.Ssh.isFileOrDirectory(unproxify(props.connection.ssh), props.connection.path);

            if (!contentType.success) {
                throw new Error(contentType.message);
            }

            if (!contentType.message) {
                throw new Error("Path not valid");
            }

            if (contentType.message.trim() === 'directory') {
                api.Ssh.getFilesInDirectory(unproxify(props.connection.ssh), props.connection.path).then((data) => {
                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    filesInDirectory.value = (data.message as string).trim().split('\n');
                    isDirectory.value = true;
                });
                return;
            } else {

                api.Ssh.readFromPath(unproxify(props.connection.ssh), props.connection.path)
                    .then((data) => {
                        if (!data.success) {
                            throw new Error(data.message);
                        }
                        content.value = data.message as string;
                    });
                return;
            }
        }
    } catch (error: any) {
        errorMsg.value = error?.message ?? "Error reading log file";
        console.error(error)
    } finally {
        isLoading.value = false;
    }
});

const applicationStore = useApplicationStore();

function closeConnection(uid: string) {
    applicationStore.closeConnection(uid);
    nextTick(() => applicationStore.changePage('connections'));
}

</script>