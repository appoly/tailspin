<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" :class="active ? 'border-primary/40' : ''">
        <Clock class="h-3.5 w-3.5" />
        <span class="whitespace-nowrap">{{ active ? label : 'Time' }}</span>
        <span
          v-if="active"
          class="-mr-1 ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted"
          role="button"
          aria-label="Clear time filter"
          @click.stop.prevent="$emit('clear')"
        >
          <X class="h-3 w-3" />
        </span>
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-72 p-3">
      <div class="text-[11px] font-medium text-muted-foreground mb-1.5">Quick ranges</div>
      <div class="flex flex-wrap gap-1.5">
        <Button
          v-for="option in presets"
          :key="option.value"
          variant="outline"
          size="xs"
          class="text-xs"
          :class="preset === option.value ? 'bg-accent text-accent-foreground' : ''"
          @click="$emit('update:preset', option.value)"
        >
          {{ option.label }}
        </Button>
      </div>
      <p class="mt-1.5 text-[10px] text-muted-foreground">
        Counted back from the newest entry<span v-if="newestLabel">, {{ newestLabel }}</span>.
      </p>

      <Separator class="my-3" />

      <div class="space-y-2">
        <label class="flex items-center justify-between gap-2 text-xs">
          <span class="text-muted-foreground w-10">From</span>
          <input
            type="datetime-local"
            :value="from"
            class="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            @input="$emit('update:from', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="flex items-center justify-between gap-2 text-xs">
          <span class="text-muted-foreground w-10">To</span>
          <input
            type="datetime-local"
            :value="to"
            class="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            @input="$emit('update:to', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>

      <!-- Only meaningful when the log actually wrote an offset to convert from. -->
      <template v-if="canSwitchTimezone">
        <Separator class="my-3" />
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">Timestamps</span>
          <div class="flex items-center rounded-md border border-input p-0.5">
            <button
              v-for="mode in (['server', 'local'] as TimeZoneMode[])"
              :key="mode"
              class="h-6 rounded-sm px-2 text-[11px] capitalize transition-colors"
              :class="timezone === mode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="$emit('update:timezone', mode)"
            >
              {{ mode }}
            </button>
          </div>
        </div>
      </template>

      <Separator class="my-3" />
      <Button variant="ghost" size="xs" class="w-full text-xs" :disabled="!active" @click="$emit('clear')">
        Clear time filter
      </Button>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import type { TimeZoneMode } from '@/lib/logText'
import type { TimePreset } from '@/composables/useLogFilters'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Clock, X } from 'lucide-vue-next'

defineProps<{
  preset: TimePreset
  from: string
  to: string
  timezone: TimeZoneMode
  canSwitchTimezone: boolean
  active: boolean
  label: string
  newestLabel: string
}>()

defineEmits<{
  'update:preset': [value: TimePreset]
  'update:from': [value: string]
  'update:to': [value: string]
  'update:timezone': [value: TimeZoneMode]
  clear: []
}>()

const presets: { label: string; value: TimePreset }[] = [
  { label: 'Last 15 min', value: '15m' },
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Today', value: 'today' },
  { label: 'All', value: '' },
]
</script>
