<template>
    <i :class="fullIconClass" :style="{ color: iconColor ?? 'currentColor' }"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    iconClass: string;
    iconColor?: string;
}>();

const fullIconClass = computed(() => 'bi bi-' + props.iconClass);
</script>

<style lang="scss" scoped></style>