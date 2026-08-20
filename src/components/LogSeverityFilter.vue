<template>
  <button
    @click="$emit('click')"
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer"
    :class="[severityColor, selected ? 'ring-2 ring-offset-1 ring-offset-background' : 'opacity-75 hover:opacity-100']"
  >
    {{ severity }}
    <span class="bg-white/20 px-1 rounded-full text-[10px]">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  severity: string
  count: number
  selected: boolean
}>()
defineEmits<{ click: [] }>()

const severityColor = computed(() => {
  const colors: Record<string, string> = {
    EMERGENCY: 'bg-red-600 text-white ring-red-600',
    ALERT: 'bg-red-500 text-white ring-red-500',
    CRITICAL: 'bg-red-500 text-white ring-red-500',
    ERROR: 'bg-red-400 text-white ring-red-400',
    WARNING: 'bg-yellow-500 text-white ring-yellow-500',
    NOTICE: 'bg-blue-400 text-white ring-blue-400',
    INFO: 'bg-blue-500 text-white ring-blue-500',
    DEBUG: 'bg-gray-500 text-white ring-gray-500',
    PROCESSING: 'bg-purple-500 text-white ring-purple-500',
    PROCESSED: 'bg-emerald-500 text-white ring-emerald-500',
    FAILED: 'bg-red-600 text-white ring-red-600',
  }
  return colors[props.severity] || 'bg-gray-500 text-white ring-gray-500'
})
</script>
