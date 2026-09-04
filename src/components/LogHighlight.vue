<template>
  <template v-for="(segment, i) in segments" :key="i"><mark v-if="segment.match" class="bg-yellow-400/30 text-inherit rounded-sm px-0.5">{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { highlightSegments } from '@/lib/logText'

const props = defineProps<{
  text: string
  term?: string
}>()

// Interpolation escapes for us, so the search term can never inject markup.
const segments = computed(() => highlightSegments(props.text, props.term ?? ''))
</script>
