<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-semibold">Downloads</h1>
      <Button variant="outline" size="sm" class="h-7 text-xs" @click="openDownloadsFolder">
        <FolderOpen class="h-3 w-3 mr-1" />
        Open Downloads Folder
      </Button>
    </div>

    <div v-if="!sortedDownloads.length" class="flex flex-col items-center justify-center py-16 text-center">
      <Download class="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p class="text-sm text-muted-foreground">No downloads yet.</p>
    </div>

    <div v-else class="border rounded-md">
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left text-xs font-medium text-muted-foreground px-3 py-2">Name</th>
            <th class="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-40">Date</th>
            <th class="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-28">Status</th>
            <th class="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dl in sortedDownloads" :key="dl.name" class="border-b last:border-0 hover:bg-muted/50">
            <td class="px-3 py-2 text-xs font-mono truncate max-w-[300px]">{{ dl.name }}</td>
            <td class="px-3 py-2 text-xs text-muted-foreground">{{ formatDate(dl.date) }}</td>
            <td class="px-3 py-2">
              <span v-if="dl.type === 'inProgress'" class="inline-flex items-center gap-1 text-xs text-blue-400">
                <Loader2 class="h-3 w-3 animate-spin" />
                In Progress
              </span>
              <span v-else-if="dl.type === 'completed'" class="inline-flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle class="h-3 w-3" />
                Completed
              </span>
              <span v-else class="inline-flex items-center gap-1 text-xs text-destructive">
                <XCircle class="h-3 w-3" />
                Failed
              </span>
            </td>
            <td class="px-3 py-2">
              <Button
                v-if="dl.type === 'completed'"
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                @click="openFile(dl.name)"
              >
                <FolderOpen class="h-3 w-3" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileAPI } from '@/lib/backend'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Button } from '@/components/ui/button'
import { FolderOpen, Download, Loader2, CheckCircle, XCircle } from 'lucide-vue-next'

const applicationStore = useApplicationStore()

const sortedDownloads = computed(() =>
  [...applicationStore.downloads].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
)

function formatDate(date: Date) {
  return new Date(date).toLocaleString()
}

async function openFile(name: string) {
  await FileAPI.OpenFolderToFile(name)
}

async function openDownloadsFolder() {
  await FileAPI.OpenDownloadsFolder()
}
</script>
