<template>
    <div>
        <div class="d-flex flex-wrap justify-content-between w-100" id="logViewerHeader">
            <h1>{{ connection.name }}</h1>
            <span>
                <button @click="() => closeConnection(connection.uid)" class="btn btn-outline-danger btn-sm">Close</button>
            </span>
        </div>
        <LocalLogViewer v-if="props.connection.type === 'local'" :connection="connection" />
        <SshLogViewer v-else :connection="connection" />
    </div>
</template>

<script setup lang="ts">
import LocalLogViewer from '@/components/LocalLogViewer.vue';
import SshLogViewer from '@/components/SshLogViewer.vue';
import { Connection } from '@/interfaces';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { nextTick } from 'vue';

const props = defineProps<{
    connection: Connection;
}>();

const applicationStore = useApplicationStore();

function closeConnection(uid: string) {
    applicationStore.closeConnection(uid);
    nextTick(() => applicationStore.changePage('connections'));
}

</script>