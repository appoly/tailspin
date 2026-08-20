<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>SSH Passphrase Required</DialogTitle>
        <DialogDescription>
          This connection requires an SSH passphrase. It will not be saved.
        </DialogDescription>
      </DialogHeader>
      <form @submit.prevent="handleSubmit">
        <Input
          ref="inputRef"
          v-model="passphrase"
          type="password"
          placeholder="Enter passphrase"
          class="mb-4"
          required
        />
        <div class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="$emit('update:open', false)">Cancel</Button>
          <Button type="submit">Connect</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [passphrase: string]
}>()

const passphrase = ref('')
const inputRef = ref()

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    passphrase.value = ''
    nextTick(() => inputRef.value?.$el?.focus())
  }
})

function handleSubmit() {
  emit('submit', passphrase.value)
  emit('update:open', false)
}
</script>
