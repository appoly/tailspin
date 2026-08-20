<template>
  <div>
    <div
      class="flex items-start gap-2 px-2 py-1.5 cursor-pointer transition-colors hover:bg-muted/50 border-b border-border/50"
      @click="showAll = !showAll"
    >
      <!-- Severity -->
      <div class="w-24 shrink-0">
        <span
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
          :class="severityColor"
        >
          <component :is="severityIcon" class="h-2.5 w-2.5" />
          {{ logItem.severity }}
        </span>
      </div>
      <!-- Timestamp -->
      <div class="w-40 shrink-0 text-xs text-muted-foreground font-mono">
        {{ logItem.timestamp }}
      </div>
      <!-- Text -->
      <div class="flex-1 min-w-0 text-xs text-muted-foreground break-all">
        {{ truncate(logItem.text, 200) }}
      </div>
      <!-- Copy button -->
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 shrink-0"
            @click.stop="copyText(logItem.text)"
          >
            <Check v-if="copied" class="h-3 w-3 text-emerald-500" />
            <Clipboard v-else class="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy to clipboard</TooltipContent>
      </Tooltip>
    </div>
    <!-- Expanded view -->
    <Collapsible :open="showAll">
      <CollapsibleContent>
        <pre class="p-3 mx-2 mb-2 text-xs bg-muted/50 rounded-md overflow-auto max-h-[400px] font-mono select-text">{{ logItem.text }}</pre>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Clipboard, Check, Info, AlertTriangle, AlertCircle, HelpCircle, Bug, Bell, Flame, XCircle } from 'lucide-vue-next'
import { ClipboardSetText } from '@/lib/backend'

const props = defineProps<{ logItem: LogEntry }>()

const showAll = ref(false)
const copied = ref(false)

function truncate(text: string, max: number) {
  return text.length > max ? text.substring(0, max) + '...' : text
}

async function copyText(text: string) {
  try {
    await ClipboardSetText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}

const severityColor = computed(() => {
  const colors: Record<string, string> = {
    EMERGENCY: 'bg-red-600 text-white',
    ALERT: 'bg-red-500 text-white',
    CRITICAL: 'bg-red-500 text-white',
    ERROR: 'bg-red-400 text-white',
    WARNING: 'bg-yellow-500 text-white',
    NOTICE: 'bg-blue-400 text-white',
    INFO: 'bg-blue-500 text-white',
    DEBUG: 'bg-gray-500 text-white',
    PROCESSING: 'bg-purple-500 text-white',
    PROCESSED: 'bg-emerald-500 text-white',
    FAILED: 'bg-red-600 text-white',
  }
  return colors[props.logItem.severity] || 'bg-gray-500 text-white'
})

const severityIcon = computed(() => {
  const icons: Record<string, any> = {
    INFO: Info,
    WARNING: AlertTriangle,
    ERROR: AlertCircle,
    CRITICAL: Flame,
    ALERT: Bell,
    EMERGENCY: Flame,
    DEBUG: Bug,
    NOTICE: Info,
    FAILED: XCircle,
  }
  return icons[props.logItem.severity] || HelpCircle
})
</script>
