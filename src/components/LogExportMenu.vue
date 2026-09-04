<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" class="h-8 gap-1.5 text-xs" :disabled="!entries.length">
        <Download class="h-3.5 w-3.5" />
        Export
      </Button>
    </PopoverTrigger>

    <PopoverContent align="end" class="w-52 p-1">
      <button
        v-for="option in options"
        :key="option.label"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
        @click="run(option.run)"
      >
        <component :is="option.icon" class="h-3.5 w-3.5 text-muted-foreground" />
        {{ option.label }}
      </button>
      <p class="px-2 py-1.5 text-[10px] text-muted-foreground">
        {{ entries.length }} filtered {{ entries.length === 1 ? 'entry' : 'entries' }}, oldest first.
      </p>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry } from '@/types/interfaces'
import { buildExportJson, buildExportText, exportFilename } from '@/lib/logText'
import { ClipboardSetText } from '@/lib/backend'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Download, ClipboardCopy, FileText, FileJson } from 'lucide-vue-next'

const props = defineProps<{ entries: LogEntry[] }>()

const open = ref(false)

const options = [
  { label: 'Copy as text', icon: ClipboardCopy, run: copyAsText },
  { label: 'Save as .log', icon: FileText, run: saveAsLog },
  { label: 'Save as .json', icon: FileJson, run: saveAsJson },
]

async function run(action: () => void | Promise<void>) {
  open.value = false
  await action()
}

async function copyAsText() {
  const text = buildExportText(props.entries)
  try {
    await ClipboardSetText(text)
  } catch {
    await navigator.clipboard.writeText(text)
  }
}

function saveAsLog() {
  download(buildExportText(props.entries), 'text/plain', exportFilename('log'))
}

function saveAsJson() {
  download(buildExportJson(props.entries), 'application/json', exportFilename('json'))
}

/** Electron puts up its own save dialog for a download, so no IPC is needed. */
function download(contents: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the download a tick to start before the blob goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
</script>
