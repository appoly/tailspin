<template>
  <div class="rounded-md border bg-muted/20 mb-3 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-2 px-2.5 h-9 border-b bg-muted/30">
      <button
        type="button"
        class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        @click="collapsed = !collapsed"
      >
        <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ '-rotate-90': collapsed }" />
        <span>{{ files.length }} {{ files.length === 1 ? 'file' : 'files' }}</span>
      </button>

      <!-- Collapsed: one line about whatever is open -->
      <div v-if="collapsed" class="flex-1 min-w-0 flex items-center gap-1.5 text-xs">
        <component :is="selectedFile?.compressed ? FileArchive : FileText" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span class="font-mono truncate">{{ selectedFile?.name ?? 'No file selected' }}</span>
        <span v-if="selectedFile" class="text-muted-foreground shrink-0">
          · {{ bytesToHumanReadableFileSize(selectedFile.size) }} · {{ relativeTimeFromUnix(selectedFile.modified) }}
        </span>
      </div>

      <div v-else class="flex-1 min-w-0 flex items-center justify-end gap-2">
        <Input
          v-if="files.length > 6"
          v-model="filter"
          placeholder="Filter files..."
          class="h-7 max-w-52 text-xs"
        />
      </div>
    </div>

    <!-- List -->
    <div v-if="!collapsed" class="max-h-60 overflow-y-auto">
      <ContextMenu v-for="file in visibleFiles" :key="file.path">
        <ContextMenuTrigger as-child>
          <div
            class="group flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-xs transition-colors"
            :class="file.path === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'"
            :title="file.path"
            @click="emit('select', file)"
          >
            <component
              :is="file.compressed ? FileArchive : FileText"
              class="h-3.5 w-3.5 shrink-0"
              :class="file.path === selected ? '' : 'text-muted-foreground'"
            />
            <span class="font-mono truncate">{{ file.name }}</span>

            <span class="flex-1" />

            <Button
              v-if="canDownload"
              variant="ghost"
              size="icon"
              class="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Download this file"
              @click.stop="emit('download', file)"
            >
              <Download class="h-3 w-3" />
            </Button>

            <span class="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
              {{ bytesToHumanReadableFileSize(file.size) }}
            </span>
            <span class="shrink-0 w-24 text-right font-mono text-[11px] text-muted-foreground">
              {{ relativeTimeFromUnix(file.modified) }}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem @select="emit('select', file)">
            <FolderOpen class="mr-2 h-3.5 w-3.5" />
            Open
          </ContextMenuItem>
          <ContextMenuItem v-if="canDownload" @select="emit('download', file)">
            <Download class="mr-2 h-3.5 w-3.5" />
            Download
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem @select="copyPath(file)">
            <Clipboard class="mr-2 h-3.5 w-3.5" />
            Copy Path
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <div v-if="!visibleFiles.length" class="px-2.5 py-3 text-xs text-muted-foreground">
        {{ files.length ? 'No files match that filter.' : 'No log files found in this directory.' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LogFile } from '@/types/interfaces'
import { ClipboardSetText } from '@/lib/backend'
import { bytesToHumanReadableFileSize, relativeTimeFromUnix } from '@/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { ChevronDown, Clipboard, Download, FileArchive, FileText, FolderOpen } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    files: LogFile[]
    selected: string
    canDownload?: boolean
  }>(),
  { canDownload: false }
)

const emit = defineEmits<{ select: [file: LogFile]; download: [file: LogFile] }>()

const collapsed = ref(false)
const filter = ref('')

const selectedFile = computed(() => props.files.find(file => file.path === props.selected) ?? null)

const visibleFiles = computed(() => {
  const query = filter.value.trim().toLowerCase()
  const matches = query ? props.files.filter(file => file.name.toLowerCase().includes(query)) : props.files
  return [...matches].sort((a, b) => b.modified - a.modified)
})

async function copyPath(file: LogFile) {
  await ClipboardSetText(file.path)
}
</script>
