<template>
    <a @click="() => $emit('setPage', { page: pageId })" href="javascript://"
        class="nav-link text-center py-3 border-bottom rounded-0" :class="active && 'active'" aria-current="page"
        data-bs-toggle="tooltip" data-bs-placement="right" :aria-label="label" :data-bs-original-title="label">
        <i class="h2" :class="icon"></i>
    </a>
</template>

<script setup lang="ts">
defineProps<{
    label: string;
    icon: string;
    tooltip: string;
    active: boolean;
    pageId: string;
}>();

defineEmits(['setPage']);
</script>

<style scoped></style>