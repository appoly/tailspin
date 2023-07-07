<template>
    <a @click="() => $emit('setPage', { page: pageId })" href="javascript://"
        class="w-100 nav-link text-center py-2 border-bottom border-top rounded-0 position-relative" :class="active && 'active'" aria-current="page"
        data-bs-toggle="tooltip" data-bs-placement="right" :aria-label="label" :data-bs-original-title="label">
        <i class="h3" :class="icon"></i>
        <slot name="badge"></slot>
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