<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <component
        :is="getIcon(connection.icon)"
        class="h-5 w-5 shrink-0"
        :style="{ color: connection.iconColor || 'currentColor' }"
      />
      <h1 class="text-sm font-semibold flex-1 truncate">{{ connection.name }}</h1>
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="closeConnection">
        <X class="h-4 w-4" />
      </Button>
    </div>

    <LocalLogViewer v-if="connection.type === 'local'" :connection="connection" />
    <SshLogViewer v-else :connection="connection" />
  </div>
</template>

<script setup lang="ts">
import type { Connection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Button } from '@/components/ui/button'
import {
  X, Terminal, Server, Database, Globe, Cloud, Monitor,
  HardDrive, Folder, Shield, Zap, Code, Wifi, Lock, Key, Box, Cpu,
  Layers, Network, Radio, Rocket, Star, Tag, Wrench, Activity, Briefcase,
  Coffee, Compass, Hash, Heart, Home,
} from 'lucide-vue-next'
import LocalLogViewer from '@/components/LocalLogViewer.vue'
import SshLogViewer from '@/components/SshLogViewer.vue'

const props = defineProps<{ connection: Connection }>()
const applicationStore = useApplicationStore()

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

function closeConnection() {
  applicationStore.closeConnection(props.connection.uid)
  applicationStore.changePage('connections')
}
</script>
