<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="applicationStore.changePage('connections')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <h1 class="text-lg font-semibold">Add Connection</h1>
    </div>

    <ConnectionForm :initial-values="prefillConnection" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BaseConnection } from '@/types/interfaces'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-vue-next'
import ConnectionForm from '@/components/ConnectionForm.vue'

const applicationStore = useApplicationStore()

const prefillConnection = computed(() => {
  const params = applicationStore.routeParams
  if (params.prefillConnection) {
    try {
      return JSON.parse(params.prefillConnection) as BaseConnection
    } catch {
      return undefined
    }
  }
  return undefined
})
</script>
