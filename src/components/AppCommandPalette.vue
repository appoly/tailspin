<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogContent class="p-0 gap-0 max-w-lg" @interact-outside="isOpen = false">
      <Command v-model:search-term="searchTerm" class="rounded-lg border-0">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup v-if="!activeFolder" heading="Actions">
            <CommandItem
              v-for="action in filteredActions"
              :key="action.label"
              :value="action.label"
              @select="action.action"
            >
              <component :is="action.icon" class="mr-2 h-4 w-4" />
              {{ action.label }}
            </CommandItem>
          </CommandGroup>
          <CommandGroup v-if="activeFolder === 'open'" heading="Open Connection">
            <CommandItem
              v-for="conn in connectionStore.connections"
              :key="conn.uid"
              :value="'open-' + conn.name"
              @select="() => { applicationStore.goToConnection(conn.uid); close() }"
            >
              {{ conn.name }}
            </CommandItem>
          </CommandGroup>
          <CommandGroup v-if="activeFolder === 'close'" heading="Close Connection">
            <CommandItem
              v-for="conn in connectionStore.openConnections"
              :key="conn.uid"
              :value="'close-' + conn.name"
              @select="() => { applicationStore.closeConnection(conn.uid); applicationStore.changePage('connections'); close() }"
            >
              {{ conn.name }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { Plus, FolderOpen, FolderClosed, LayoutGrid, Settings } from 'lucide-vue-next'

const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const isOpen = ref(false)
const searchTerm = ref('')
const activeFolder = ref('')

const actions = computed(() => {
  const items: any[] = [
    { label: 'Create Connection', icon: Plus, action: () => { applicationStore.changePage('connections.add'); close() } },
    { label: 'Show All Connections', icon: LayoutGrid, action: () => { applicationStore.changePage('connections'); close() } },
    { label: 'Open Settings', icon: Settings, action: () => { applicationStore.changePage('settings'); close() } },
  ]
  if (connectionStore.connections.length > 0) {
    items.splice(1, 0, { label: 'Open Connection...', icon: FolderOpen, action: () => { activeFolder.value = 'open' } })
  }
  if (connectionStore.openConnections.length > 0) {
    items.splice(2, 0, { label: 'Close Connection...', icon: FolderClosed, action: () => { activeFolder.value = 'close' } })
  }
  return items
})

const filteredActions = computed(() => {
  if (!searchTerm.value) return actions.value
  return actions.value.filter(a => a.label.toLowerCase().includes(searchTerm.value.toLowerCase()))
})

function close() {
  isOpen.value = false
  searchTerm.value = ''
  activeFolder.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    isOpen.value = !isOpen.value
    if (!isOpen.value) close()
  }
  if (e.key === 'Escape' && activeFolder.value) {
    activeFolder.value = ''
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
