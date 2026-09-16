<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { TimeZoneMode } from '@/lib/logText'
import { boundsLabel, clockMillis, dayLabel, normalizeTime, selectionBounds, type LogTimeSummary, type TimeSelection } from '@/lib/logTimeFilter'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import LogDatePicker from './LogDatePicker.vue'
import { Clock, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  selection: TimeSelection | null
  summary: LogTimeSummary
  timezone: TimeZoneMode
  canSwitchTimezone: boolean
  active: boolean
  label: string
  disabled?: boolean
  previewCount: (value: TimeSelection) => number
}>()
const emit = defineEmits<{
  apply: [value: TimeSelection]
  'update:timezone': [value: TimeZoneMode]
  clear: []
}>()
const id = useId()
const open = ref(false)
const timeInput = ref<HTMLInputElement>()
const explicitDates = ref(false)
const draft = ref<TimeSelection>({ mode: 'around', day: '', time: '', radius: 15, endDay: '', endTime: '' })
const singleDay = computed(() => props.summary.days.length === 1)
const showDates = computed(() => !singleDay.value || explicitDates.value || draft.value.day !== draft.value.endDay || draft.value.day !== props.summary.days[0]?.date)
const bounds = computed(() => selectionBounds(draft.value))
const count = computed(() => bounds.value ? props.previewCount(draft.value) : 0)
const selectedDay = computed(() => props.summary.days.find(day => day.date === draft.value.day))
const hours = computed(() => selectedDay.value?.hours ?? Array(24).fill(0) as number[])
const peak = computed(() => Math.max(1, ...hours.value))
const coverage = computed(() => {
  const { first, last } = props.summary
  if (!first || !last) return 'No timestamps available'
  return first.slice(0, 10) === last.slice(0, 10)
    ? `Loaded ${first.slice(11)}–${last.slice(11)}`
    : `Loaded ${dayLabel(first.slice(0, 10))} – ${dayLabel(last.slice(0, 10))}`
})
const error = computed(() => {
  if (!normalizeTime(draft.value.time) || (draft.value.mode === 'range' && !normalizeTime(draft.value.endTime))) return 'Enter a time like 6am, 06:30 or 18:00.'
  if (!bounds.value) return 'End must be after start. Choose another end date for an overnight range.'
  return ''
})
const previewLabel = computed(() => bounds.value ? boundsLabel(bounds.value, showDates.value) : '')
const controlClass = 'w-full rounded-md border border-input bg-background px-3 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive'

function seed() {
  const day = props.summary.last.slice(0, 10)
  draft.value = props.selection ? { ...props.selection } : {
    mode: 'around', day, time: '', radius: 15, endDay: day, endTime: '',
  }
  explicitDates.value = false
}
watch(open, value => { if (value) seed() })
async function focusTime(event: Event) {
  event.preventDefault()
  await nextTick()
  timeInput.value?.focus()
  timeInput.value?.select()
}
function setDay(day: string) {
  if (draft.value.day === draft.value.endDay) draft.value.endDay = day
  draft.value.day = day
}
function setMode(mode: TimeSelection['mode']) {
  if (mode === 'range' && draft.value.mode === 'around' && bounds.value) {
    const from = new Date(bounds.value.from).toISOString()
    const to = new Date(bounds.value.to).toISOString()
    draft.value.day = from.slice(0, 10)
    draft.value.time = from.slice(11, 16)
    draft.value.endDay = to.slice(0, 10)
    draft.value.endTime = to.slice(11, 16)
  }
  draft.value.mode = mode
}
function chooseHour(hour: number) {
  draft.value.mode = 'range'
  draft.value.time = `${String(hour).padStart(2, '0')}:00`
  draft.value.endDay = draft.value.day
  draft.value.endTime = `${String(hour).padStart(2, '0')}:59`
}
function wholeDay() {
  draft.value.mode = 'range'
  draft.value.time = '00:00'
  draft.value.endDay = draft.value.day
  draft.value.endTime = '23:59'
}
function shiftDay(direction: number) {
  const day = direction < 0
    ? [...props.summary.days].reverse().find(day => day.date < draft.value.day)
    : props.summary.days.find(day => day.date > draft.value.day)
  if (day) setDay(day.date)
}
function hourSelected(hour: number) {
  const start = clockMillis(`${draft.value.day}T${String(hour).padStart(2, '0')}:00`)
  return start !== null && bounds.value && start <= bounds.value.to && start + 3_600_000 > bounds.value.from
}
function apply() {
  if (!bounds.value) return
  emit('apply', { ...draft.value, time: normalizeTime(draft.value.time)!, endTime: normalizeTime(draft.value.endTime) ?? '' })
  open.value = false
}
function clear() { emit('clear'); open.value = false }
</script>

<template>
  <div class="flex shrink-0 items-center">
    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" :class="active ? 'rounded-r-none border-primary/40 bg-accent' : ''"
          :disabled="disabled || !summary.days.length" :title="active ? label : 'Find entries by time'">
          <Clock class="size-3.5" />
          <span class="max-w-56 truncate">{{ active ? label : 'Find time' }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" class="w-[360px] max-w-[calc(100vw-24px)] flex max-h-[min(640px,var(--reka-popover-content-available-height))] flex-col p-0" @open-auto-focus="focusTime">
        <form class="flex min-h-0 flex-col" @submit.prevent="apply">
          <div class="min-h-0 space-y-3 overflow-y-auto p-4">
            <div>
              <h2 class="text-sm font-semibold">Find a moment</h2>
              <div class="mt-1 flex items-center justify-between gap-2">
                <p class="text-xs text-muted-foreground">{{ coverage }}</p>
                <button v-if="singleDay && !showDates" type="button" class="shrink-0 rounded text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" @click="explicitDates = true">Choose dates</button>
              </div>
            </div>

            <div v-if="!showDates" class="text-sm font-medium">{{ dayLabel(draft.day) }}</div>
            <div v-else class="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous loaded day" :disabled="!summary.days.some(day => day.date < draft.day)" @click="shiftDay(-1)"><ChevronLeft /></Button>
              <LogDatePicker :model-value="draft.day" :days="summary.days" label="Date" @update:model-value="setDay" />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Next loaded day" :disabled="!summary.days.some(day => day.date > draft.day)" @click="shiftDay(1)"><ChevronRight /></Button>
            </div>

            <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" aria-label="Time filter mode">
              <button v-for="mode in (['around', 'range'] as const)" :key="mode" type="button" class="rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="draft.mode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'" :aria-pressed="draft.mode === mode" @click="setMode(mode)">{{ mode === 'around' ? 'Around a time' : 'Exact range' }}</button>
            </div>

            <div v-if="draft.mode === 'around'" class="space-y-3">
              <label :for="`${id}-time`" class="block text-xs font-medium">Time</label>
              <input :id="`${id}-time`" ref="timeInput" v-model="draft.time" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. 6am" :class="[controlClass, 'h-12 text-2xl']" :aria-invalid="!!draft.time && !normalizeTime(draft.time)" :aria-describedby="`${id}-hint`" />
              <p :id="`${id}-hint`" class="text-xs text-muted-foreground">Type 6am, 06:30 or 18:00. Times use a 24-hour clock.</p>
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">Either side</span>
                <div class="flex gap-1" aria-label="Minutes either side">
                  <Button v-for="minutes in [5, 15, 30, 60]" :key="minutes" type="button" variant="outline" size="xs" class="text-xs"
                    :class="draft.radius === minutes ? 'border-primary/40 bg-accent' : ''" :aria-pressed="draft.radius === minutes" @click="draft.radius = minutes">±{{ minutes }}m</Button>
                </div>
              </div>
            </div>
            <div v-else class="grid grid-cols-2 gap-3">
              <div class="space-y-2">
                <label :for="`${id}-from`" class="block text-xs font-medium">From</label>
                <input :id="`${id}-from`" ref="timeInput" v-model="draft.time" type="text" autocomplete="off" placeholder="e.g. 6am" :class="[controlClass, 'h-10 text-base']" :aria-invalid="!!draft.time && !normalizeTime(draft.time)" :aria-describedby="`${id}-feedback`" />
                <LogDatePicker v-if="showDates" :model-value="draft.day" :days="summary.days" label="Start date" @update:model-value="setDay" />
              </div>
              <div class="space-y-2">
                <label :for="`${id}-to`" class="block text-xs font-medium">Through</label>
                <input :id="`${id}-to`" v-model="draft.endTime" type="text" autocomplete="off" placeholder="e.g. 7am" :class="[controlClass, 'h-10 text-base']" :aria-invalid="!!draft.endTime && !normalizeTime(draft.endTime)" :aria-describedby="`${id}-feedback`" />
                <LogDatePicker v-if="showDates" v-model="draft.endDay" :days="summary.days" label="End date" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">Activity by hour</span>
                <Button type="button" variant="ghost" size="xs" class="h-6 text-xs" @click="wholeDay">Whole day</Button>
              </div>
              <div class="mt-1 grid h-10 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5" aria-label="Select an hour">
                <button v-for="(total, hour) in hours" :key="hour" type="button"
                  class="group flex h-full items-end rounded-sm px-px pb-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :class="hourSelected(hour) ? 'bg-accent' : ''"
                  :aria-label="`${String(hour).padStart(2, '0')}:00–${String(hour).padStart(2, '0')}:59, ${total} loaded entries`"
                  :aria-pressed="!!hourSelected(hour)" :title="`${String(hour).padStart(2, '0')}:00 · ${total} entries`" @click="chooseHour(hour)">
                  <span class="w-full rounded-t-sm transition-colors" :class="hourSelected(hour) ? 'bg-primary' : 'bg-muted-foreground/50 group-hover:bg-muted-foreground'" :style="{ height: total ? `${Math.max(10, total / peak * 100)}%` : '2px' }" />
                </button>
              </div>
              <div class="flex justify-between text-[11px] tabular-nums text-muted-foreground" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
            </div>

            <div v-if="canSwitchTimezone" class="flex items-center justify-between gap-2 border-t border-border pt-3">
              <span class="text-xs text-muted-foreground">Display times in</span>
              <div class="flex gap-1">
                <Button v-for="zone in (['server', 'local'] as TimeZoneMode[])" :key="zone" type="button" variant="ghost" size="xs" class="text-xs"
                  :class="timezone === zone ? 'bg-accent' : ''" :aria-pressed="timezone === zone" @click="emit('update:timezone', zone)">{{ zone === 'server' ? 'Log timezone' : 'My timezone' }}</Button>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">Using timestamps as written in the log.</p>
          </div>

          <div class="shrink-0 space-y-3 border-t border-border bg-muted/30 p-4">
            <div :id="`${id}-feedback`" aria-live="polite" class="space-y-1">
              <template v-if="bounds">
                <p class="text-sm font-medium">{{ count.toLocaleString() }} matching {{ count === 1 ? 'entry' : 'entries' }}</p>
                <p class="text-xs tabular-nums text-muted-foreground">{{ previewLabel }}</p>
                <p v-if="count === 0" class="text-xs text-muted-foreground">Try a wider window or another time. Only loaded entries are searched.</p>
              </template>
              <p v-else class="text-xs" :class="draft.time ? 'text-destructive' : 'text-muted-foreground'">{{ draft.time ? error : 'Enter a time or select an hour above.' }}</p>
            </div>
            <div class="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="sm" :disabled="!active" @click="clear">Clear filter</Button>
              <Button type="submit" size="sm" :disabled="!bounds">Show entries</Button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
    <Button v-if="active" variant="outline" size="icon-sm" class="h-8 w-7 rounded-l-none border-l-0 border-primary/40 bg-accent" aria-label="Clear time filter" @click="clear"><X class="size-3.5" /></Button>
  </div>
</template>
