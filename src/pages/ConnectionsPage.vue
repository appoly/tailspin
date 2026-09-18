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
      <div class="flex items-center gap-2">
        <ToggleGroup
          v-if="connectionStore.connections.length"
          type="single"
          variant="outline"
          :model-value="view"
          @update:model-value="v => v && setView(v as ConnectionsView)"
          aria-label="List density"
        >
          <ToggleGroupItem value="cards" class="h-8 w-8 p-0" title="Cards"><LayoutGrid class="h-3.5 w-3.5" /></ToggleGroupItem>
          <ToggleGroupItem value="compact" class="h-8 w-8 p-0" title="Compact list"><List class="h-3.5 w-3.5" /></ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" class="h-8" @click="applicationStore.changePage('connections.add')">
          <Plus class="h-3.5 w-3.5 mr-1.5" />
          New connection
        </Button>
      </div>
    </div>

    <!-- Search and tag filters -->
    <div v-if="connectionStore.connections.length" class="mb-4 space-y-2">
      <div class="relative max-w-xl">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          v-model="search"
          placeholder="Search by name, host, path or tag..."
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
      <div v-if="allTags.length" class="flex flex-wrap items-center gap-1.5">
        <Tag class="h-3 w-3 text-muted-foreground" />
        <button
          v-for="tag in allTags"
          :key="tag"
          type="button"
          class="rounded-full border px-2 py-0.5 text-[11px] leading-4 transition-colors"
          :class="activeTags.has(tag) ? 'border-primary/40 bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'"
          :aria-pressed="activeTags.has(tag)"
          @click="toggleTag(tag)"
        >{{ tag }}</button>
        <button
          v-if="activeTags.size"
          type="button"
          class="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground ml-1"
          @click="activeTags = new Set()"
        >Clear</button>
      </div>
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

    <!-- Nothing passes the filters -->
    <div v-else-if="visible.length === 0" class="py-10 text-center">
      <p class="text-xs text-muted-foreground">No connections match{{ search ? ` “${search}”` : '' }}{{ activeTags.size ? ` with ${[...activeTags].join(', ')}` : '' }}</p>
      <Button variant="link" size="sm" class="text-xs h-auto mt-1" @click="search = ''; activeTags = new Set()">Clear filters</Button>
    </div>

    <!-- Lists: favorites first, everything else below, never the same card twice -->
    <template v-else>
      <div v-if="favorites.length > 0" class="mb-5">
        <SectionLabel>
          <Star class="h-2.5 w-2.5 fill-current" />
          Favorites
        </SectionLabel>
        <div :class="listClass">
          <ConnectionCard v-for="conn in favorites" :key="conn.uid" :connection="conn" :compact="compact" />
        </div>
      </div>

      <div v-if="others.length > 0">
        <SectionLabel v-if="favorites.length > 0">Other connections</SectionLabel>
        <!-- Dragging reorders the saved list, which only makes sense when the whole list is showing. -->
        <draggable
          v-if="!filtering"
          :model-value="others"
          @update:model-value="reorderOthers"
          item-key="uid"
          handle=".drag-handle"
          ghost-class="opacity-30"
          :class="listClass"
        >
          <template #item="{ element }">
            <ConnectionCard :connection="element" :compact="compact" draggable />
          </template>
        </draggable>
        <div v-else :class="listClass">
          <ConnectionCard v-for="conn in others" :key="conn.uid" :connection="conn" :compact="compact" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, type FunctionalComponent } from 'vue'
import type { Connection } from '@/types/interfaces'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { StorageAPI } from '@/lib/backend'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Plus, Search, X, Server, Star, Tag, LayoutGrid, List } from 'lucide-vue-next'
import draggable from 'vuedraggable'
import ConnectionCard from '@/components/ConnectionCard.vue'

type ConnectionsView = 'cards' | 'compact'

const connectionStore = useConnectionStore()
const applicationStore = useApplicationStore()

const search = ref('')
const activeTags = ref<Set<string>>(new Set())
const view = ref<ConnectionsView>('cards')
const compact = computed(() => view.value === 'compact')
const filtering = computed(() => search.value.trim() !== '' || activeTags.value.size > 0)

onMounted(async () => {
  const stored = await StorageAPI.Get('app.connectionsView', 'cards')
  view.value = stored === 'compact' ? 'compact' : 'cards'
})

async function setView(next: ConnectionsView) {
  view.value = next
  await StorageAPI.Set('app.connectionsView', next)
}

// Cards: one per row until there's room for two side by side; the sidebar eats
// 48px, so xl is the first breakpoint where two columns still read well.
// Compact: always one dense column.
const listClass = computed(() =>
  compact.value
    ? 'flex flex-col'
    : 'grid grid-cols-1 xl:grid-cols-2 min-[1800px]:grid-cols-3 gap-x-4 gap-y-0.5'
)

const SectionLabel: FunctionalComponent = (_, { slots }) =>
  h(
    'p',
    { class: 'flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5' },
    slots.default?.()
  )

const allTags = computed(() => {
  const tags = new Set<string>()
  for (const connection of connectionStore.connections) for (const tag of connection.tags ?? []) tags.add(tag)
  return [...tags].sort((a, b) => a.localeCompare(b))
})

function toggleTag(tag: string) {
  const next = new Set(activeTags.value)
  if (next.has(tag)) next.delete(tag)
  else next.add(tag)
  activeTags.value = next
}

const countLabel = computed(() => {
  const total = connectionStore.connections.length
  if (total === 0) return 'Nothing saved yet'
  const favs = connectionStore.connections.filter(c => c.isFavorite).length
  const conns = `${total} connection${total === 1 ? '' : 's'}`
  return favs ? `${conns} · ${favs} favorite${favs === 1 ? '' : 's'}` : conns
})

/** Search matches name, host, path or tag; active tags must all be present. */
const visible = computed<Connection[]>(() => {
  const q = search.value.trim().toLowerCase()
  const required = [...activeTags.value]
  return connectionStore.connections.filter(c => {
    if (required.some(tag => !(c.tags ?? []).includes(tag))) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.path.toLowerCase().includes(q) ||
      (c.ssh?.host ?? '').toLowerCase().includes(q) ||
      (c.tags ?? []).some(tag => tag.toLowerCase().includes(q))
    )
  })
})

const favorites = computed(() =>
  visible.value.filter(c => c.isFavorite).sort((a, b) => a.name.localeCompare(b.name))
)
const others = computed(() => visible.value.filter(c => !c.isFavorite))

/** Favorites keep their saved positions; only the non-favorites are reordered. */
function reorderOthers(reordered: Connection[]) {
  const queue = [...reordered]
  const next = connectionStore.connections.map(c => (c.isFavorite ? c : queue.shift()!))
  connectionStore.reorderConnections(next)
}
</script>
