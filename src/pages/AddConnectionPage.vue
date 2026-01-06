<template>
    <div>
        <h1>Add Connection</h1>

        <TheConnectionForm @saved="handleSave" :initialValues="initialValues" />
    </div>
</template>

<script setup lang="ts">
import TheConnectionForm from '@/components/TheConnectionForm.vue';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { computed } from 'vue';
import { BaseConnection } from '$/interfaces';

const applicationStore = useApplicationStore();

const initialValues = computed<BaseConnection | undefined>(() => {
    const prefillData = applicationStore.routeParams.prefillConnection;
    if (prefillData) {
        try {
            return JSON.parse(prefillData) as BaseConnection;
        } catch (e) {
            console.error('Failed to parse prefill connection data:', e);
            return undefined;
        }
    }
    return undefined;
});

function handleSave() {
    applicationStore.changePage('connections', { success: 'Connection saved' });
}

</script>