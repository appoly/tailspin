<template>
    <div>
        <h1>Edit Connection</h1>
        <div v-if="isLoading">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        <TheConnectionForm v-else :connection="connection" @saved="handleSave" />
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { Connection } from "$/interfaces";
import { onMounted, ref } from 'vue';
import TheConnectionForm from '@/components/TheConnectionForm.vue';

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const isLoading = ref(true);
const connection = ref<Connection>();

onMounted(() => {
    connection.value = connectionStore.getById(applicationStore.routeParams.connectionUid);
    if (!connection.value) {
        applicationStore.changePage('connections', { error: 'Connection not found' });
        return;
    }
    isLoading.value = false;
})

function handleSave() {
    applicationStore.changePage('connections', { success: `Connection '${connection.value!.name}' Updated` });
}

</script>

<style scoped></style>