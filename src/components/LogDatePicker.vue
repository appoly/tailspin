<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseDate, type DateValue } from '@internationalized/date'
import {
  CalendarRoot, CalendarHeader, CalendarHeading, CalendarPrev, CalendarNext,
  CalendarGrid, CalendarGridHead, CalendarGridBody, CalendarGridRow,
  CalendarHeadCell, CalendarCell, CalendarCellTrigger,
} from 'reka-ui'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { dayLabel, type LogDay } from '@/lib/logTimeFilter'

const props = defineProps<{ modelValue: string; days: LogDay[]; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const selected = computed(() => props.modelValue ? parseDate(props.modelValue) : undefined)
const available = computed(() => new Set(props.days.map(day => day.date)))
function select(value: DateValue | undefined) {
  if (!value) return
  emit('update:modelValue', value.toString())
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" size="sm" class="w-full justify-start font-normal" :aria-label="`${label}: ${modelValue ? dayLabel(modelValue) : 'Choose date'}`">
        <CalendarDays class="size-3.5" />
        {{ modelValue ? dayLabel(modelValue) : 'Choose date' }}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-[280px] p-3">
      <CalendarRoot v-slot="{ grid, weekDays }" :model-value="selected" :default-placeholder="selected"
        :week-starts-on="1" locale="en-GB" fixed-weeks prevent-deselect initial-focus @update:model-value="select">
        <CalendarHeader class="mb-3 flex items-center justify-between">
          <CalendarPrev as-child><Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month"><ChevronLeft /></Button></CalendarPrev>
          <CalendarHeading class="text-sm font-medium" />
          <CalendarNext as-child><Button type="button" variant="ghost" size="icon-sm" aria-label="Next month"><ChevronRight /></Button></CalendarNext>
        </CalendarHeader>
        <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="w-full border-collapse">
          <CalendarGridHead>
            <CalendarGridRow>
              <CalendarHeadCell v-for="weekday in weekDays" :key="weekday" class="h-8 text-xs font-normal text-muted-foreground">{{ weekday }}</CalendarHeadCell>
            </CalendarGridRow>
          </CalendarGridHead>
          <CalendarGridBody>
            <CalendarGridRow v-for="(week, index) in month.rows" :key="index">
              <CalendarCell v-for="date in week" :key="date.toString()" :date="date" class="p-0.5 text-center">
                <CalendarCellTrigger as="button" type="button" :day="date" :month="month.value"
                  class="relative inline-flex size-8 items-center justify-center rounded-md text-xs tabular-nums hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[outside-view]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground">
                  {{ date.day }}
                  <span v-if="available.has(date.toString())" class="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />
                </CalendarCellTrigger>
              </CalendarCell>
            </CalendarGridRow>
          </CalendarGridBody>
        </CalendarGrid>
      </CalendarRoot>
      <p class="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">Dotted dates have loaded entries.</p>
    </PopoverContent>
  </Popover>
</template>
