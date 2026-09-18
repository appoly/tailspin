<template>
  <span v-if="tags?.length" class="flex items-center gap-1 min-w-0 shrink" :class="$attrs.class">
    <span
      v-for="tag in tags"
      :key="tag"
      class="rounded bg-muted px-1 py-px text-[10px] leading-4 text-muted-foreground whitespace-nowrap"
    >{{ tag }}</span>
  </span>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ tags?: string[] }>()
</script>
