<template>
    <div>
        <div class="d-flex flex-wrap justify-content-between w-100">
            <h1>{{ connection.name }}</h1>
            <span>
                <button @click="() => closeConnection(connection.uid)" class="btn btn-outline-danger btn-sm">Close</button>
            </span>
        </div>
        <TheLogViewer :connection="connection" />
    </div>
</template>

<script setup lang="ts">
import TheLogViewer from '@/components/TheLogViewer.vue';
import { Connection } from '@/interfaces';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { nextTick } from 'vue';

defineProps<{
    connection: Connection;
}>();

const applicationStore = useApplicationStore();

function closeConnection(uid: string) {
    applicationStore.closeConnection(uid);
    nextTick(() => applicationStore.changePage('connections'));
}

</script>

<style scoped></style>