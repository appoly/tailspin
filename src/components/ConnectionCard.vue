<template>
  <div>
  <!-- Single root element on purpose, with nothing beside it (not even a comment):
       vuedraggable's item slot needs exactly one element to sort, and a fragment
       root makes it lose track of the item ("Cannot read properties of null"). -->
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="group relative flex items-center rounded-md cursor-pointer transition-colors hover:bg-muted/70"
        :class="compact ? 'gap-2 pl-6 pr-1.5 py-1' : 'gap-3 pl-6 pr-2 py-2'"
        @click="applicationStore.goToConnection(connection.uid)"
      >
        <!-- Drag grip lives inside the card's left padding, so cards that cannot be
             dragged (favorites) line up with those that can. -->
        <GripVertical
          v-if="draggable"
          class="drag-handle absolute left-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
          @click.stop
        />

        <!-- Icon on its tinted tile, the connection's signature everywhere it appears -->
        <div
          class="rounded-md flex items-center justify-center shrink-0"
          :class="compact ? 'h-6 w-6' : 'h-8 w-8'"
          :style="{ backgroundColor: iconTint }"
        >
          <component :is="icon" :class="compact ? 'h-3.5 w-3.5' : 'h-4 w-4'" :style="{ color: connection.iconColor || 'currentColor' }" />
        </div>

        <!-- Name, location, tags -->
        <div v-if="!compact" class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-sm font-medium truncate">{{ connection.name }}</span>
            <Star v-if="connection.isFavorite" class="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
            <ConnectionTags :tags="connection.tags" class="ml-1" />
          </div>
          <div class="text-[11px] font-mono text-muted-foreground truncate">{{ location }}</div>
        </div>
        <template v-else>
          <span class="text-xs font-medium truncate shrink-0 max-w-[40%]">{{ connection.name }}</span>
          <Star v-if="connection.isFavorite" class="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
          <span class="flex-1 min-w-0 text-[11px] font-mono text-muted-foreground truncate">{{ location }}</span>
          <ConnectionTags :tags="connection.tags" />
        </template>

        <Badge :variant="connection.type === 'remote' ? 'secondary' : 'outline'" class="text-[10px] px-1.5 py-0 shrink-0">
          {{ connection.type === 'remote' ? 'SSH' : 'Local' }}
        </Badge>

        <!-- The same actions as the right-click menu, behind a visible button -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
              :aria-label="`Actions for ${connection.name}`"
              @click.stop
            >
              <Ellipsis class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" @click.stop>
            <template v-for="(item, index) in actions" :key="index">
              <DropdownMenuSeparator v-if="item.separator" />
              <DropdownMenuItem v-else :class="item.destructive ? 'text-destructive focus:text-destructive' : ''" @select="item.run">
                <component :is="item.icon" :class="item.iconClass" />
                {{ item.label }}
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </ContextMenuTrigger>

    <ContextMenuContent class="min-w-40">
      <template v-for="(item, index) in actions" :key="index">
        <ContextMenuSeparator v-if="item.separator" />
        <ContextMenuItem
          v-else
          class="gap-2 text-xs [&>svg]:size-3.5"
          :class="item.destructive ? 'text-destructive focus:text-destructive' : ''"
          @select="item.run"
        >
          <component :is="item.icon" :class="item.iconClass" />
          {{ item.label }}
        </ContextMenuItem>
      </template>
    </ContextMenuContent>
  </ContextMenu>

  <Dialog :open="confirmingDelete" @update:open="confirmingDelete = $event">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete “{{ connection.name }}”?</DialogTitle>
        <DialogDescription>
          The saved connection{{ connection.type === 'remote' && connection.ssh?.passwordType === 'password' ? ' and its stored password' : '' }}
          will be removed from Tailspin. Nothing on the server is touched. This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div class="flex justify-end gap-2">
        <Button variant="outline" size="sm" @click="confirmingDelete = false">Cancel</Button>
        <Button variant="destructive" size="sm" @click="deleteConnection">Delete</Button>
      </div>
    </DialogContent>
  </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import type { Connection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { copySshCommand, openInTerminal } from '@/lib/sshCommand'
import { getConnectionIcon } from '@/lib/connectionIcons'
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ConnectionTags from './ConnectionTags.vue'
import { Star, Pencil, Trash2, Clipboard, Terminal, Ellipsis, GripVertical, Link } from 'lucide-vue-next'

const props = defineProps<{
  connection: Connection
  /** One dense row instead of a two-line card. */
  compact?: boolean
  /** Show the drag grip; the parent's draggable list uses `.drag-handle`. */
  draggable?: boolean
}>()
const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const confirmingDelete = ref(false)
const icon = computed(() => getConnectionIcon(props.connection.icon))

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

type Action =
  | { separator: true }
  | { separator?: false; label: string; icon: Component; iconClass?: string; destructive?: boolean; run: () => void }

const actions = computed<Action[]>(() => {
  const remote = props.connection.type === 'remote'
  return [
    { label: 'Edit connection', icon: Pencil, run: editConnection },
    {
      label: props.connection.isFavorite ? 'Remove from favorites' : 'Add to favorites',
      icon: Star,
      iconClass: props.connection.isFavorite ? 'fill-current' : '',
      run: toggleFavorite,
    },
    { separator: true },
    { label: 'Copy path', icon: Link, run: copyPath },
    ...(remote
      ? [
          { label: 'Copy SSH command', icon: Clipboard, run: copyCommand },
          { label: 'Open in terminal', icon: Terminal, run: openTerminal },
        ]
      : []),
    { separator: true },
    { label: 'Delete…', icon: Trash2, destructive: true, run: () => { confirmingDelete.value = true } },
  ]
})

function toggleFavorite() {
  connectionStore.updateConnection({ ...props.connection, isFavorite: !props.connection.isFavorite })
}

function editConnection() {
  applicationStore.changePage('connections.edit', { connectionUid: props.connection.uid })
}

async function copyPath() {
  await navigator.clipboard.writeText(props.connection.path)
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
  confirmingDelete.value = false
  connectionStore.removeConnection(props.connection.uid)
}
</script>
