<template>
  <!-- Structured lines are block children, so the element's own whitespace is
       normalised and each line opts back into wrapping. -->
  <pre class="p-3 mx-2 mb-2 text-xs bg-muted/50 rounded-md overflow-auto max-h-[400px] font-mono selectable select-text whitespace-normal">
    <template v-for="(line, i) in lines" :key="i">
      <div
        v-if="line.kind === 'frame'"
        class="whitespace-pre-wrap break-all"
        :class="line.vendor ? 'opacity-60' : ''"
      ><span class="text-muted-foreground">{{ line.marker }} </span><span v-if="line.location" class="text-foreground font-medium"><LogHighlight :text="line.location" :term="term" /></span><span class="text-muted-foreground"><LogHighlight :text="line.rest" :term="term" /></span></div>
      <div
        v-else-if="line.kind === 'label'"
        class="mt-1.5 mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/70"
      >{{ line.text }}</div>
      <div
        v-else-if="line.kind === 'json'"
        class="my-1 pl-2 border-l border-border text-muted-foreground whitespace-pre-wrap break-all"
      ><LogHighlight :text="line.text" :term="term" /></div>
      <div v-else class="whitespace-pre-wrap break-all"><LogHighlight :text="line.text" :term="term" /></div>
    </template>
  </pre>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildExpandedLines } from '@/lib/logText'
import LogHighlight from './LogHighlight.vue'

const props = defineProps<{
  text: string
  term?: string
}>()

const lines = computed(() => buildExpandedLines(props.text))
</script>
