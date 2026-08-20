<template>
  <div>
    <div class="border rounded-md">
      <LogEntry v-for="(item, i) in currentPageItems" :key="i" :logItem="item" />
    </div>
    <LogPaginator
      :totalItems="filteredLogItems.length"
      :itemsPerPage="itemsPerPage"
      :page="page"
      @changePage="$emit('changePage', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LogEntry as LogEntryType } from '@/types/interfaces'
import LogEntry from './LogEntry.vue'
import LogPaginator from './LogPaginator.vue'
import { debounce } from '@/helpers'

const props = defineProps<{
  page: number
  itemsPerPage: number
  searchTerm: string
  selectedSeverity: string
  logEntries: LogEntryType[]
}>()
const emit = defineEmits<{ changePage: [page: number] }>()

const filteredLogItems = ref<LogEntryType[]>([])

const currentPageItems = computed(() =>
  filteredLogItems.value.slice((props.page - 1) * props.itemsPerPage, props.page * props.itemsPerPage)
)

// Watch the logEntries array itself (not just .length) so replacements are caught
watch(() => props.logEntries, () => loadAndFilter(false), { immediate: true })
watch(() => props.searchTerm, debounce(loadAndFilter, 250))
watch(() => props.selectedSeverity, () => loadAndFilter())

function loadAndFilter(resetPage = true) {
  if (resetPage) emit('changePage', 1)
  let items = props.logEntries
  if (props.selectedSeverity) {
    items = items.filter(item => item.severity === props.selectedSeverity)
  }
  if (props.searchTerm) {
    const lower = props.searchTerm.toLowerCase()
    items = items.filter(item =>
      item.text.toLowerCase().includes(lower) ||
      item.severity.toLowerCase().includes(lower) ||
      item.timestamp.includes(lower)
    )
  }
  filteredLogItems.value = items
}
</script>
