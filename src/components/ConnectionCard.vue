<template>
  <ContextMenu>
    <ContextMenuTrigger>
      <div
        class="flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/70 group"
        @click="applicationStore.goToConnection(connection.uid)"
      >
        <!-- Icon tile -->
        <div
          class="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
          :style="{ backgroundColor: iconTint }"
        >
          <component
            :is="getConnectionIcon(connection.icon)"
            class="h-4 w-4"
            :style="{ color: connection.iconColor || 'currentColor' }"
          />
        </div>

        <!-- Name + location -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-sm font-medium truncate">{{ connection.name }}</span>
            <Star
              v-if="connection.isFavorite"
              class="h-3 w-3 shrink-0 fill-amber-400 text-amber-400"
            />
          </div>
          <div class="text-[11px] font-mono text-muted-foreground truncate">{{ location }}</div>
        </div>

        <!-- Quick actions (hover) -->
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="toggleFavorite">
                <Star class="h-3.5 w-3.5" :class="connection.isFavorite ? 'fill-amber-400 text-amber-400' : ''" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" class="text-xs">
              {{ connection.isFavorite ? 'Remove from favorites' : 'Add to favorites' }}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="h-7 w-7" @click="editConnection">
                <Pencil class="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" class="text-xs">Edit connection</TooltipContent>
          </Tooltip>
        </div>

        <Badge :variant="connection.type === 'remote' ? 'secondary' : 'outline'" class="text-[10px] px-1.5 py-0 shrink-0">
          {{ connection.type === 'remote' ? 'SSH' : 'Local' }}
        </Badge>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem @select="applicationStore.goToConnection(connection.uid)">
        <FolderOpen class="mr-2 h-3.5 w-3.5" />
        Open
      </ContextMenuItem>
      <ContextMenuItem @select="toggleFavorite">
        <Star class="mr-2 h-3.5 w-3.5" :class="connection.isFavorite ? 'fill-current' : ''" />
        {{ connection.isFavorite ? 'Remove from Favorites' : 'Add to Favorites' }}
      </ContextMenuItem>
      <ContextMenuItem @select="editConnection">
        <Pencil class="mr-2 h-3.5 w-3.5" />
        Edit Connection
      </ContextMenuItem>
      <template v-if="connection.type === 'remote'">
        <ContextMenuItem @select="copyCommand">
          <Clipboard class="mr-2 h-3.5 w-3.5" />
          Copy SSH Command
        </ContextMenuItem>
        <ContextMenuItem @select="openTerminal">
          <Terminal class="mr-2 h-3.5 w-3.5" />
          Open in Terminal
        </ContextMenuItem>
      </template>
      <ContextMenuSeparator />
      <ContextMenuItem class="text-destructive" @select="deleteConnection">
        <Trash2 class="mr-2 h-3.5 w-3.5" />
        Delete Connection
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Connection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { copySshCommand, openInTerminal } from '@/lib/sshCommand'
import { getConnectionIcon } from '@/lib/connectionIcons'
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Star, Pencil, Trash2, FolderOpen, Clipboard, Terminal } from 'lucide-vue-next'

const props = defineProps<{ connection: Connection }>()
const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const location = computed(() => {
  if (props.connection.type === 'remote' && props.connection.ssh) {
    return `${props.connection.ssh.username}@${props.connection.ssh.host} · ${props.connection.path}`
  }
  return props.connection.path
})

// Soft tint of the connection's icon color for the icon tile background
const iconTint = computed(() => {
  const color = props.connection.iconColor
  return color ? `color-mix(in srgb, ${color} 14%, transparent)` : 'hsl(var(--muted))'
})

function toggleFavorite() {
  connectionStore.updateConnection({ ...props.connection, isFavorite: !props.connection.isFavorite })
}

function editConnection() {
  applicationStore.changePage('connections.edit', { connectionUid: props.connection.uid })
}

function copyCommand() {
  copySshCommand(props.connection)
}

async function openTerminal() {
  const result = await openInTerminal(props.connection)
  // No ssh:// handler on this machine, so leave the user something to paste.
  if (!result.success) await copySshCommand(props.connection)
}

function deleteConnection() {
  connectionStore.removeConnection(props.connection.uid)
}
</script>
