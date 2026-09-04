<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <!-- The dialog's own close button would sit on top of the search field -->
    <DialogContent class="p-0 gap-0 max-w-xl overflow-hidden [&>button]:hidden">
      <DialogTitle class="sr-only">Command palette</DialogTitle>
      <DialogDescription class="sr-only">
        Search your connections, open tabs and app actions.
      </DialogDescription>

      <ListboxRoot class="flex flex-col overflow-hidden" highlight-on-hover>
        <div class="flex items-center border-b px-3">
          <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <ListboxFilter
            v-model="searchTerm"
            auto-focus
            placeholder="Search connections, tabs and actions…"
            class="flex h-11 w-full bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground"
          />
        </div>

        <ListboxContent class="max-h-[60vh] overflow-y-auto overflow-x-hidden p-1 outline-hidden">
          <div v-if="groups.length === 0" class="py-6 text-center text-sm text-muted-foreground">
            Nothing matches
          </div>

          <ListboxGroup v-for="group in groups" :key="group.heading" class="py-1">
            <ListboxGroupLabel class="px-2 py-1 text-xs font-medium text-muted-foreground">
              {{ group.heading }}
            </ListboxGroupLabel>
            <ListboxItem
              v-for="item in group.items"
              :key="item.id"
              :value="item.id"
              class="flex cursor-default select-none items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-hidden data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              @select="item.run()"
            >
              <component
                :is="item.icon"
                class="h-4 w-4 shrink-0"
                :style="{ color: item.iconColor || 'currentColor' }"
              />
              <div class="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span class="max-w-[55%] shrink-0 truncate">{{ item.title }}</span>
                <span v-if="item.subtitle" class="truncate text-[11px] font-mono text-muted-foreground">
                  · {{ item.subtitle }}
                </span>
              </div>
              <Badge
                v-for="badge in item.badges"
                :key="badge"
                :variant="badge === 'SSH' ? 'secondary' : 'outline'"
                class="shrink-0 px-1.5 py-0 text-[10px] font-normal"
              >
                {{ badge }}
              </Badge>
            </ListboxItem>
          </ListboxGroup>
        </ListboxContent>

        <div class="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <span class="flex items-center gap-1"><kbd :class="kbdClass">↑↓</kbd> navigate</span>
          <span class="flex items-center gap-1"><kbd :class="kbdClass">↵</kbd> select</span>
          <span class="flex items-center gap-1"><kbd :class="kbdClass">esc</kbd> close</span>
        </div>
      </ListboxRoot>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import {
  ListboxRoot, ListboxFilter, ListboxContent, ListboxGroup, ListboxGroupLabel, ListboxItem,
} from 'reka-ui'
import { Search } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useCommandPalette } from '@/composables/useCommandPalette'

const kbdClass = 'text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded'

const isOpen = ref(false)
const searchTerm = ref('')

const { groups } = useCommandPalette(searchTerm, () => { isOpen.value = false })

// A stale term would filter the next open before the user has typed anything.
watch(isOpen, (open) => {
  if (!open) searchTerm.value = ''
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    isOpen.value = !isOpen.value
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
