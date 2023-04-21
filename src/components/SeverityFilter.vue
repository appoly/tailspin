<template>
    <!-- pill -->
    <span :class="['filter', 'badge', 'rounded-pill', 'h-fit', severityColour(severity), { 'selected': selected }]">
        {{ severity }} <span class="badge bg-light text-dark">{{ count }}</span>
    </span>
</template>

<script setup lang="ts">
defineProps<{
    severity: string;
    count: number;
    selected: boolean;
}>();

const severityColour = (severity: string) => {
    switch (severity) {
        case "INFO":
            return "bg-primary";
        case "WARN":
            return "bg-warning";
        case "ERROR":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
};
</script>

<style scoped>
.h-fit {
    height: fit-content;
}
</style>