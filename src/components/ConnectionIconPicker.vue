<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="icon" class="h-9 w-9">
        <component :is="currentIcon" class="h-4 w-4" :style="{ color: color }" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-64 p-2">
      <div class="grid grid-cols-6 gap-1 mb-2">
        <button
          v-for="(icon, name) in connectionIcons"
          :key="name"
          class="flex items-center justify-center h-8 w-8 rounded-md transition-colors"
          :class="modelValue === name ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
          @click="$emit('update:modelValue', name)"
        >
          <component :is="icon" class="h-4 w-4" :style="{ color: color }" />
        </button>
      </div>
      <Separator class="my-2" />
      <div class="flex items-center gap-2">
        <label class="text-xs text-muted-foreground">Color:</label>
        <input
          type="color"
          :value="color"
          @input="$emit('update:color', String(($event.target as HTMLInputElement).value))"
          class="h-6 w-6 rounded cursor-pointer border-0 p-0"
        />
        <Input
          :model-value="color"
          @update:model-value="$emit('update:color', String($event ?? ''))"
          class="h-7 text-xs flex-1"
          placeholder="#ffffff"
        />
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { connectionIcons, getConnectionIcon } from '@/lib/connectionIcons'

const props = defineProps<{
  modelValue: string
  color: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  'update:color': [value: string]
}>()

const currentIcon = computed(() => getConnectionIcon(props.modelValue))
</script>
