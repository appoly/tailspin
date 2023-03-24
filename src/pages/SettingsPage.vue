<template>
    <div class="mb-5">
        <button @click="userStore.toggleTheme" class="btn btn-primary">Toggle Theme</button>
    </div>

    <BootstrapIconPickerVue></BootstrapIconPickerVue>
</template>

<script setup lang="ts">
import BootstrapIconPickerVue from '@/components/BootstrapIconPicker.vue';
import { useUserStore } from '@/stores/useUserStore';

const userStore = useUserStore();

</script>

<style scoped></style>