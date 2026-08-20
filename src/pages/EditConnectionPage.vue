<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" class="h-7 w-7" @click="applicationStore.changePage('connections')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <h1 class="text-lg font-semibold">Edit Connection</h1>
    </div>

    <template v-if="connection">
      <ConnectionForm :connection="connection" />
    </template>
    <template v-else>
      <div class="space-y-3">
        <Skeleton class="h-9 w-full" />
        <Skeleton class="h-8 w-full" />
        <Skeleton class="h-8 w-2/3" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-vue-next'
import ConnectionForm from '@/components/ConnectionForm.vue'

const applicationStore = useApplicationStore()
const connectionStore = useConnectionStore()

const connection = computed(() =>
  connectionStore.getById(applicationStore.routeParams.connectionUid)
)
</script>
