<template>
  <div class="w-full">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-lg font-semibold">Connections</h1>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ countLabel }}
        </p>
      </div>
      <Button size="sm" class="h-8" @click="applicationStore.changePage('connections.add')">
        <Plus class="h-3.5 w-3.5 mr-1.5" />
        New connection
      </Button>
    </div>

    <!-- Search -->
    <div v-if="connectionStore.connections.length" class="relative mb-4 max-w-xl">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        v-model="search"
        placeholder="Search by name, host or path..."
        class="h-8 text-sm pl-8 pr-8"
        @keydown.esc="search = ''"
      />
      <button
        v-if="search"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
        @click="search = ''"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Empty state: nothing saved yet -->
    <div v-if="connectionStore.connections.length === 0" class="rounded-lg border border-dashed py-14 flex flex-col items-center text-center">
      <div class="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Server class="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 class="text-sm font-medium">No connections yet</h2>
      <p class="text-xs text-muted-foreground mt-1 mb-4 max-w-[280px]">
        Add a local log file or connect to a server over SSH to start viewing logs.
      </p>
      <div class="flex items-center gap-2">
        <Button size="sm" @click="applicationStore.changePage('connections.add')">
          <Plus class="h-3.5 w-3.5 mr-1.5" />
          Add connection
        </Button>
        <Button
          v-if="applicationStore.forgeSectionEnabled && applicationStore.canUseSafeStorage"
          variant="outline"
          size="sm"
          @click="applicationStore.changePage('connections.forge')"
        >
          Browse Forge
        </Button>
      </div>
    </div>

    <!-- Search results -->
    <template v-else-if="search">
      <div>
        <SectionLabel>Results</SectionLabel>
        <div :class="gridClass">
          <ConnectionCard v-for="conn in filteredConnections" :key="conn.uid" :connection="conn" />
        </div>
        <div v-if="filteredConnections.length === 0" class="py-10 text-center">
          <p class="text-xs text-muted-foreground">No connections match "{{ search }}"</p>
          <Button variant="link" size="sm" class="text-xs h-auto mt-1" @click="search = ''">Clear search</Button>
        </div>
      </div>
    </template>

    <!-- Lists -->
    <template v-else>
      <div v-if="favorites.length > 0" class="mb-5">
        <SectionLabel>
          <Star class="h-2.5 w-2.5 fill-current" />
          Favorites
        </SectionLabel>
        <div :class="gridClass">
          <ConnectionCard v-for="conn in favorites" :key="conn.uid" :connection="conn" />
        </div>
      </div>

      <div>
        <SectionLabel v-if="favorites.length > 0">All connections</SectionLabel>
        <draggable
          :model-value="connectionStore.connections"
          @update:model-value="connectionStore.reorderConnections"
          item-key="uid"
          handle=".drag-handle"
          ghost-class="opacity-30"
          :class="gridClass"
        >
          <template #item="{ element }">
            <div class="flex items-center group/drag">
              <GripVertical class="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab drag-handle mr-0.5 shrink-0" />
              <div class="flex-1 min-w-0">
                <ConnectionCard :connection="element" />
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, type FunctionalComponent } from 'vue'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, GripVertical, Search, X, Server, Star } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import ConnectionCard from '@/components/ConnectionCard.vue'

const connectionStore = useConnectionStore()
const applicationStore = useApplicationStore()

const search = ref('')

// One card per row until there's room for two side by side; the sidebar eats
// 48px, so xl is the first breakpoint where two columns still read well.
const gridClass = 'grid grid-cols-1 xl:grid-cols-2 min-[1800px]:grid-cols-3 gap-x-4 gap-y-0.5'

const SectionLabel: FunctionalComponent = (_, { slots }) =>
  h(
    'p',
    { class: 'flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5' },
    slots.default?.()
  )

const countLabel = computed(() => {
  const total = connectionStore.connections.length
  if (total === 0) return 'Nothing saved yet'
  const favs = favorites.value.length
  const conns = `${total} connection${total === 1 ? '' : 's'}`
  return favs ? `${conns} · ${favs} favorite${favs === 1 ? '' : 's'}` : conns
})

const favorites = computed(() =>
  connectionStore.connections
    .filter((c) => c.isFavorite)
    .sort((a, b) => a.name.localeCompare(b.name))
)

const filteredConnections = computed(() => {
  const q = search.value.toLowerCase()
  return connectionStore.connections.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.path.toLowerCase().includes(q) ||
      c.ssh?.host?.toLowerCase().includes(q)
  )
})
</script>
