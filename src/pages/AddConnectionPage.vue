<template>
    <div>
        <TheConnectionForm @saved="handleSave" />
    </div>
</template>

<script setup lang="ts">
import TheConnectionForm from '@/components/TheConnectionForm.vue';
import { useApplicationStore } from '@/stores/useApplicationStore';

const applicationStore = useApplicationStore();

function handleSave() {
    applicationStore.changePage('connections', { success: 'Connection saved' });
}

</script>