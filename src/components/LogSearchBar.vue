<template>
  <div class="relative">
    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    <Input
      ref="inputRef"
      :model-value="searchTerm"
      @update:model-value="$emit('update:searchTerm', String($event))"
      :placeholder="placeholder"
      :disabled="disabled"
      class="pl-8 h-8 text-sm"
    />
    <kbd v-if="!searchTerm" class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
      /
    </kbd>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-vue-next'

defineProps<{
  placeholder?: string
  disabled?: boolean
  searchTerm: string
}>()
defineEmits<{ 'update:searchTerm': [value: string] }>()

const inputRef = ref()

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault()
    inputRef.value?.$el?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
