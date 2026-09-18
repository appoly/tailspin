<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-2.5 py-1.5 text-xs"
    :class="mode.kind === 'tail' ? 'border-border bg-muted/30 text-muted-foreground' : 'border-primary/40 bg-accent/60'"
  >
    <span class="inline-flex items-center gap-1.5 font-medium" :class="mode.kind === 'tail' ? '' : 'text-foreground'">
      <component :is="icon" class="size-3.5" />
      {{ title }}
    </span>
    <span class="text-muted-foreground">{{ detail }}</span>

    <template v-if="mode.kind === 'window'">
      <span class="ml-auto flex items-center gap-1">
        <Button variant="outline" size="xs" class="h-6 text-xs" :disabled="busy || mode.atStart" @click="$emit('shift', -1)">
          <ChevronLeft class="size-3" /> Earlier
        </Button>
        <Button variant="outline" size="xs" class="h-6 text-xs" :disabled="busy || mode.atEnd" @click="$emit('shift', 1)">
          Later <ChevronRight class="size-3" />
        </Button>
      </span>
    </template>

    <Button
      v-if="mode.kind !== 'tail'"
      variant="ghost"
      size="xs"
      class="h-6 text-xs"
      :class="mode.kind === 'window' ? '' : 'ml-auto'"
      :disabled="busy"
      @click="$emit('exit')"
    >
      <X class="size-3" /> Back to tail
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LogViewMode } from '@/types/interfaces'
import { formatSize } from '$/search'
import { Button } from '@/components/ui/button'
import { AlignEndHorizontal, Crosshair, Search, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

const props = defineProps<{
  mode: LogViewMode
  fileSize: number
  loadedBytes: number
  busy?: boolean
}>()
defineEmits<{ exit: []; shift: [direction: -1 | 1] }>()

const icon = computed(() => (props.mode.kind === 'search' ? Search : props.mode.kind === 'window' ? Crosshair : AlignEndHorizontal))

const title = computed(() => {
  if (props.mode.kind === 'search') return 'Search results'
  if (props.mode.kind === 'window') return 'Window'
  return props.loadedBytes >= props.fileSize ? 'Whole file' : 'Tail'
})

const detail = computed(() => {
  const m = props.mode
  if (m.kind === 'search') {
    const scanned = m.timedOut ? 'stopped at the time limit' : m.scanned === 'whole' ? 'whole file scanned' : 'stopped after enough matches'
    return `${m.matches} newest ${m.matches === 1 ? 'match' : 'matches'} for “${m.pattern}” · ${scanned} in ${(m.durationMs / 1000).toFixed(1)}s`
  }
  if (m.kind === 'window') {
    const at = m.targetMs !== null ? ` around ${new Date(m.targetMs).toISOString().slice(0, 16).replace('T', ' ')}` : ''
    return `${formatSize(m.bytes)}${at} · ${Math.round((m.offset / Math.max(1, props.fileSize)) * 100)}% into ${formatSize(props.fileSize)}`
  }
  return props.loadedBytes >= props.fileSize
    ? formatSize(props.fileSize)
    : `last ${formatSize(props.loadedBytes)} of ${formatSize(props.fileSize)}`
})
</script>
