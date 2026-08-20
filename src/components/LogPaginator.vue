<template>
  <div v-if="totalItems > 0" class="flex items-center justify-center gap-2 py-4">
    <Button v-if="page !== 1" variant="outline" size="sm" @click="$emit('changePage', 1)">First</Button>
    <Button variant="outline" size="icon" class="h-8 w-8" :disabled="!hasPrev" @click="$emit('changePage', page - 1)">
      <ChevronLeft class="h-4 w-4" />
    </Button>
    <Button
      v-for="p in pageLinks"
      :key="p"
      :variant="p === page ? 'default' : 'outline'"
      size="sm"
      class="h-8 w-8"
      @click="$emit('changePage', p)"
    >
      {{ p }}
    </Button>
    <Button variant="outline" size="icon" class="h-8 w-8" :disabled="!hasNext" @click="$emit('changePage', page + 1)">
      <ChevronRight class="h-4 w-4" />
    </Button>
    <Button v-if="page !== totalPages" variant="outline" size="sm" @click="$emit('changePage', totalPages)">Last</Button>
    <span class="text-xs text-muted-foreground ml-2">
      {{ (page - 1) * itemsPerPage + 1 }}-{{ Math.min(page * itemsPerPage, totalItems) }} of {{ totalItems }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  totalItems: number
  itemsPerPage: number
  page: number
}>()
defineEmits<{ changePage: [page: number] }>()

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage))
const hasPrev = computed(() => props.page > 1)
const hasNext = computed(() => props.page < totalPages.value)
const pageLinks = computed(() => {
  const start = Math.max(1, props.page - 2)
  const end = Math.min(totalPages.value, props.page + 2)
  const links: number[] = []
  for (let i = start; i <= end; i++) links.push(i)
  return links
})
</script>
