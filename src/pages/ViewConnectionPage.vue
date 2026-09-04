<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <component
        :is="getIcon(connection.icon)"
        class="h-5 w-5 shrink-0"
        :style="{ color: connection.iconColor || 'currentColor' }"
      />
      <h1 class="text-sm font-semibold flex-1 truncate">{{ connection.name }}</h1>

      <span v-if="fallbackMessage" class="text-xs text-muted-foreground shrink-0">{{ fallbackMessage }}</span>

      <template v-if="connection.type === 'remote'">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-7 w-7" @click="openTerminal">
              <Terminal class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" class="text-xs">Open in Terminal</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="icon" class="h-7 w-7" @click="copyCommand">
              <Check v-if="copied" class="h-4 w-4 text-emerald-500" />
              <Clipboard v-else class="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" class="text-xs">Copy SSH command</TooltipContent>
        </Tooltip>
      </template>

      <Button variant="ghost" size="icon" class="h-7 w-7" @click="closeConnection">
        <X class="h-4 w-4" />
      </Button>
    </div>

    <LocalLogViewer v-if="connection.type === 'local'" :connection="connection" />
    <SshLogViewer v-else :connection="connection" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { Connection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { copySshCommand, openInTerminal } from '@/lib/sshCommand'
import {
  X, Terminal, Clipboard, Check, Server, Database, Globe, Cloud, Monitor,
  HardDrive, Folder, Shield, Zap, Code, Wifi, Lock, Key, Box, Cpu,
  Layers, Network, Radio, Rocket, Star, Tag, Wrench, Activity, Briefcase,
  Coffee, Compass, Hash, Heart, Home,
} from 'lucide-vue-next'
import LocalLogViewer from '@/components/LocalLogViewer.vue'
import SshLogViewer from '@/components/SshLogViewer.vue'

const props = defineProps<{ connection: Connection }>()
const applicationStore = useApplicationStore()

const copied = ref(false)
const fallbackMessage = ref('')
let copiedTimeout: ReturnType<typeof setTimeout> | undefined
let fallbackTimeout: ReturnType<typeof setTimeout> | undefined

function getIcon(name: string) {
  const map: Record<string, any> = {
    terminal: Terminal, server: Server, database: Database, globe: Globe,
    cloud: Cloud, monitor: Monitor, 'hard-drive': HardDrive, folder: Folder,
    shield: Shield, zap: Zap, code: Code, wifi: Wifi, lock: Lock,
    key: Key, box: Box, cpu: Cpu, layers: Layers, network: Network,
    radio: Radio, rocket: Rocket, star: Star, tag: Tag, wrench: Wrench,
    activity: Activity, briefcase: Briefcase, coffee: Coffee, compass: Compass,
    hash: Hash, heart: Heart, home: Home,
  }
  return map[name] || Terminal
}

function flagCopied() {
  copied.value = true
  clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => { copied.value = false }, 1500)
}

async function copyCommand() {
  await copySshCommand(props.connection)
  flagCopied()
}

async function openTerminal() {
  const result = await openInTerminal(props.connection)
  if (result.success) return

  // No ssh:// handler on this machine, so leave the user something to paste.
  await copySshCommand(props.connection)
  flagCopied()
  fallbackMessage.value = 'Copied SSH command instead'
  clearTimeout(fallbackTimeout)
  fallbackTimeout = setTimeout(() => { fallbackMessage.value = '' }, 2000)
}

onUnmounted(() => {
  clearTimeout(copiedTimeout)
  clearTimeout(fallbackTimeout)
})

function closeConnection() {
  applicationStore.closeConnection(props.connection.uid)
  applicationStore.changePage('connections')
}
</script>
