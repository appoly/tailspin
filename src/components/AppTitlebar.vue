<template>
  <div class="relative h-10 flex items-center border-b border-border bg-background/80 backdrop-blur-xs"
       style="-webkit-app-region: drag">
    <!-- macOS traffic light spacer -->
    <div v-if="isMac" class="w-[72px] shrink-0" />

    <!-- Open connection tabs -->
    <div class="flex-1 flex items-center gap-0.5 overflow-x-auto px-1" style="-webkit-app-region: no-drag">
      <button
        v-for="conn in connectionStore.openConnections"
        :key="conn.uid"
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors max-w-[160px] truncate"
        :class="[
          applicationStore.page === 'connections.page.' + conn.uid
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        ]"
        @click="applicationStore.goToConnection(conn.uid)"
        @contextmenu.prevent
      >
        <component :is="getIcon(conn.icon)" class="h-3 w-3 shrink-0" :style="{ color: conn.iconColor }" />
        <span class="truncate">{{ conn.name }}</span>
        <span
          role="button"
          class="ml-1 rounded-sm opacity-60 hover:opacity-100 hover:bg-muted-foreground/20 p-0.5"
          @click.stop="closeTab(conn.uid)"
        >
          <X class="h-2.5 w-2.5" />
        </span>
      </button>
    </div>

    <!-- Window title (when no tabs) -->
    <div v-if="connectionStore.openConnections.length === 0" class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
      Tailspin
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { X, Terminal } from 'lucide-vue-next'
import { nextTick, markRaw } from 'vue'
import * as icons from 'lucide-vue-next'

const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const isMac = navigator.userAgent.includes('Mac')

function getIcon(name: string) {
  // Map common icon names to lucide equivalents
  const iconMap: Record<string, any> = {
    terminal: Terminal,
    server: icons.Server,
    database: icons.Database,
    globe: icons.Globe,
    cloud: icons.Cloud,
    code: icons.Code,
    folder: icons.Folder,
    file: icons.File,
    shield: icons.Shield,
    zap: icons.Zap,
    monitor: icons.Monitor,
  }
  return iconMap[name] || Terminal
}

function closeTab(uid: string) {
  applicationStore.closeConnection(uid)
  nextTick(() => {
    if (applicationStore.page.startsWith('connections.page.' + uid)) {
      applicationStore.changePage('connections')
    }
  })
}
</script>
