<template>
  <div>
    <div ref="rowsEl" class="border rounded-md">
      <LogEntry
        v-for="(item, i) in currentPageItems"
        :key="keyFor(item)"
        :logItem="item"
        :searchTerm="searchTerm"
        :timezone="timezone"
        :expanded="expandedKeys.has(keyFor(item))"
        :active="cursor === i"
        @toggle="toggleEntry(item)"
      />
    </div>

    <div class="mt-1.5 px-1 text-[11px] text-muted-foreground">
      <kbd :class="kbdClass">j</kbd>/<kbd :class="kbdClass">k</kbd> move
      · <kbd :class="kbdClass">enter</kbd> expand
      · <kbd :class="kbdClass">c</kbd> copy
      · <kbd :class="kbdClass">/</kbd> search
    </div>

    <LogPaginator
      :totalItems="entries.length"
      :itemsPerPage="itemsPerPage"
      :page="page"
      @changePage="$emit('changePage', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch, useTemplateRef } from 'vue'
import type { LogEntry as LogEntryType } from '@/types/interfaces'
import type { TimeZoneMode } from '@/lib/logText'
import { entryKey } from '@/lib/logText'
import { ClipboardSetText } from '@/lib/backend'
import { useKeyboardNav } from '@/composables/useKeyboardNav'
import LogEntry from './LogEntry.vue'
import LogPaginator from './LogPaginator.vue'

const props = withDefaults(defineProps<{
  /** Already filtered, newest first. */
  entries: LogEntryType[]
  page: number
  itemsPerPage: number
  searchTerm?: string
  timezone?: TimeZoneMode
}>(), {
  searchTerm: '',
  timezone: 'server',
})

const emit = defineEmits<{ changePage: [page: number] }>()

const kbdClass = 'text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded'

const rowsEl = useTemplateRef<HTMLElement>('rowsEl')
// Keyed by content, so an entry stays expanded when auto-fetch prepends rows.
const expandedKeys = ref(new Set<string>())

const currentPageItems = computed(() =>
  props.entries.slice((props.page - 1) * props.itemsPerPage, props.page * props.itemsPerPage)
)
const pageCount = computed(() => Math.max(1, Math.ceil(props.entries.length / props.itemsPerPage)))

const { cursor } = useKeyboardNav({
  count: computed(() => currentPageItems.value.length),
  page: toRef(props, 'page'),
  pageCount,
  onPageChange: p => emit('changePage', p),
  onToggle: i => toggleEntry(currentPageItems.value[i]),
  onCopy: i => copyEntry(currentPageItems.value[i]),
})

watch(cursor, async index => {
  if (index < 0) return
  await nextTick()
  rowsEl.value?.children[index]?.scrollIntoView({ block: 'nearest' })
})

function keyFor(item: LogEntryType) {
  return entryKey(item)
}

function toggleEntry(item: LogEntryType | undefined) {
  if (!item) return
  const key = keyFor(item)
  const next = new Set(expandedKeys.value)
  if (!next.delete(key)) next.add(key)
  expandedKeys.value = next
}

async function copyEntry(item: LogEntryType | undefined) {
  if (!item) return
  try {
    await ClipboardSetText(item.text)
  } catch {
    await navigator.clipboard.writeText(item.text)
  }
}
</script>
