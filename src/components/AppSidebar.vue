<template>
  <div class="flex flex-col h-full w-12 border-r border-border bg-muted/30 shrink-0">
    <!-- Top nav items -->
    <div class="flex flex-col items-center gap-0.5 py-2 flex-1">
      <Tooltip v-for="item in topItems" :key="item.id">
        <TooltipTrigger as-child>
          <button
            class="relative flex items-center justify-center w-9 h-9 rounded-md transition-colors"
            :class="[
              isActive(item.id)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]"
            @click="item.action"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <!-- Auto-fetch badge -->
            <span v-if="item.badge" class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[9px] text-white">
              {{ item.badge }}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="8">
          {{ item.label }}
        </TooltipContent>
      </Tooltip>

      <!-- Separator before open connections -->
      <Separator v-if="connectionStore.openConnections.length > 0" class="my-1 w-6" />

      <!-- Open connection icons -->
      <Tooltip v-for="conn in connectionStore.openConnections" :key="conn.uid">
        <TooltipTrigger as-child>
          <button
            class="relative flex items-center justify-center w-9 h-9 rounded-md transition-colors"
            :class="[
              applicationStore.page === 'connections.page.' + conn.uid
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]"
            @click="applicationStore.changePage('connections.page.' + conn.uid)"
          >
            <Terminal class="h-4 w-4" :style="{ color: conn.iconColor }" />
            <span v-if="applicationStore.autoFetching.connectionId === conn.uid"
              class="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-sky-500">
              <RefreshCw class="h-2 w-2 text-white animate-spin" />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="8">
          {{ conn.name }}
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- Bottom nav items -->
    <div class="flex flex-col items-center gap-0.5 py-2 border-t border-border">
      <Tooltip v-for="item in bottomItems" :key="item.id">
        <TooltipTrigger as-child>
          <button
            class="relative flex items-center justify-center w-9 h-9 rounded-md transition-colors"
            :class="[
              isActive(item.id)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ]"
            @click="item.action"
          >
            <component :is="item.icon" class="h-4 w-4" />
            <span v-if="item.badge" class="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] text-white"
              :class="item.badgeColor || 'bg-sky-500'">
              {{ item.badge }}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" :side-offset="8">
          {{ item.label }}
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import {
  BookOpen, Hammer, HardDrive, Terminal, Download, Settings, RefreshCw,
} from 'lucide-vue-next'

const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const inProgressCount = computed(() =>
  applicationStore.downloads.filter(d => d.type === 'inProgress').length
)
const completedCount = computed(() =>
  applicationStore.downloads.filter(d => d.type === 'completed').length
)

const topItems = computed(() => {
  const items: any[] = [
    { id: 'log-viewer', label: 'View By File', icon: BookOpen, action: () => applicationStore.changePage('log-viewer') },
  ]
  if (applicationStore.forgeSectionEnabled) {
    items.push({ id: 'connections.forge', label: 'Laravel Forge', icon: Hammer, action: () => applicationStore.changePage('connections.forge') })
  }
  items.push({ id: 'connections', label: 'Connections', icon: HardDrive, action: () => applicationStore.changePage('connections') })
  return items
})

const bottomItems = computed(() => [
  {
    id: 'downloads', label: 'Downloads', icon: Download,
    action: () => applicationStore.changePage('downloads'),
    badge: inProgressCount.value > 0 ? inProgressCount.value : completedCount.value > 0 ? completedCount.value : undefined,
    badgeColor: inProgressCount.value > 0 ? 'bg-sky-500' : 'bg-emerald-500',
  },
  { id: 'settings', label: 'Settings', icon: Settings, action: () => applicationStore.changePage('settings') },
])

function isActive(pageId: string) {
  return applicationStore.page === pageId
}
</script>
