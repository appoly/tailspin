<template>
  <div class="mt-2 mb-4">
    <!-- Search + Filters row -->
    <div class="mb-3">
      <LogSearchBar :searchTerm="searchTerm" @update:searchTerm="searchTerm = $event" placeholder="Filter by level, time or message" :disabled="isLoading" />
    </div>
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="flex flex-wrap gap-1.5">
        <LogSeverityFilter
          v-for="filter in severityFilters"
          :key="filter.severity"
          :severity="filter.severity"
          :count="filter.count"
          :selected="selectedSeverity === filter.severity"
          @click="toggleSeverity(filter.severity)"
        />
      </div>
      <div class="flex items-center gap-2">
        <select v-model="itemsPerPage" class="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option :value="20">20 / page</option>
          <option :value="50">50 / page</option>
          <option :value="100">100 / page</option>
          <option :value="200">200 / page</option>
        </select>
        <slot name="additional-filters" />
      </div>
    </div>
  </div>

  <slot name="above-table" />

  <!-- Column headers -->
  <div class="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b border-border">
    <div class="w-24 shrink-0">Severity</div>
    <div class="w-40 shrink-0">Time</div>
    <div class="flex-1">Message</div>
    <div class="w-6"></div>
  </div>

  <!-- Error -->
  <div v-if="errorMsg" class="mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
    {{ errorMsg }}
  </div>

  <!-- Loading skeleton -->
  <div v-if="isLoading">
    <div v-for="n in 20" :key="n" class="flex items-center gap-2 px-2 py-2">
      <Skeleton class="h-4 w-20" />
      <Skeleton class="h-4 w-36" />
      <Skeleton class="h-4 flex-1" />
    </div>
  </div>

  <!-- Entries -->
  <LogEntriesTable
    v-if="logEntries.length && !isLoading"
    :logEntries="logEntries"
    :page="page"
    :itemsPerPage="itemsPerPage"
    :searchTerm="searchTerm"
    :selectedSeverity="selectedSeverity"
    @changePage="changePage"
  />

  <!-- Jump to top -->
  <div class="fixed bottom-4 right-8">
    <Button variant="outline" size="icon" class="h-8 w-8 rounded-full shadow-md" @click="jumpToTop">
      <ArrowUp class="h-4 w-4" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import { LogStatuses } from '@/constants/LogStatuses'
import LogSearchBar from './LogSearchBar.vue'
import LogSeverityFilter from './LogSeverityFilter.vue'
import LogEntriesTable from './LogEntriesTable.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-vue-next'

const props = defineProps<{
  logEntries: LogEntry[]
  isLoading: boolean
  errorMsg: string
}>()

const searchTerm = ref('')
const selectedSeverity = ref('')
const page = ref(1)
const itemsPerPage = ref(20)

defineExpose({ changePage })

const severityFilters = computed(() => {
  const filters: { severity: string; count: number }[] = []
  for (const status of LogStatuses) {
    const upper = status.toUpperCase()
    const count = props.logEntries.filter(e => e.severity === upper).length
    if (count > 0) filters.push({ severity: upper, count })
  }
  return filters
})

function changePage(p: number) { page.value = p }
function toggleSeverity(s: string) { selectedSeverity.value = selectedSeverity.value === s ? '' : s }
function jumpToTop() { document.getElementById('logViewerHeader')?.scrollIntoView({ behavior: 'smooth' }) }
</script>
