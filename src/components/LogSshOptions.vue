<template>
  <div class="rounded-md border bg-muted/30 p-3 mb-3">
    <form @submit.prevent="submit">
      <h3 class="text-sm font-medium mb-3">SSH Options</h3>
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <label class="text-xs text-muted-foreground mb-1 block">File Size Override</label>
          <select v-model.number="localBytes" class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
            <option :disabled="!canLoadEntire" :value="0">
              Load Entire File {{ !canLoadEntire ? '(too large)' : '' }}
            </option>
            <option v-for="size in FileSizesInKb" :key="size" :value="size * 1024">
              {{ kilobytesToHumanReadableFileSize(size) }}
            </option>
          </select>
        </div>
        <Button size="sm" type="submit" :disabled="isLoading">Apply</Button>
      </div>
      <p class="text-xs text-muted-foreground mt-1.5">
        Amount retrieved from end of file. Larger = more entries but slower.
      </p>
      <p v-if="localBytes === 0" class="text-xs text-yellow-500 mt-1">
        Warning: Loading entire file may cause errors on very large files.
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FileSizesInKb, MaxFileSizeToLoadKb } from '@/constants/Ssh'
import { kilobytesToHumanReadableFileSize } from '@/helpers'
import { Button } from '@/components/ui/button'
import type { SshOptions } from '@/types/interfaces'

const props = defineProps<{
  modelValue: SshOptions
  isLoading: boolean
  currentFileSize: number
}>()
const emit = defineEmits<{ submitted: []; 'update:modelValue': [val: SshOptions] }>()

const localBytes = ref(props.modelValue.numberOfBytes)
const canLoadEntire = computed(() => (props.currentFileSize / 1024) < MaxFileSizeToLoadKb)

function submit() {
  emit('update:modelValue', { numberOfBytes: localBytes.value })
  emit('submitted')
}
</script>
