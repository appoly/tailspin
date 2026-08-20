<template>
  <div :class="bare ? '' : 'rounded-md border p-4'">
    <h3 v-if="!bare" class="text-sm font-medium mb-3">Forge API Key</h3>

    <div v-if="!hasKey">
      <p class="text-xs text-muted-foreground mb-3">
        We pull your servers and sites from Forge using an API key. Create one
        <a
          href="https://forge.laravel.com/profile/api"
          target="_blank"
          class="underline underline-offset-2 hover:text-foreground"
        >in your Forge profile</a>.
        When creating the token, select the
        <code class="rounded bg-muted px-1 py-0.5 text-[11px]">organization:view</code>
        and
        <code class="rounded bg-muted px-1 py-0.5 text-[11px]">server:view</code>
        scopes only — nothing more is needed.
      </p>
      <form @submit.prevent="saveKey">
        <textarea
          v-model="apiKey"
          placeholder="Paste your Forge API key..."
          rows="3"
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none"
          required
        />
        <p v-if="errorMsg" class="text-xs text-destructive mt-1">{{ errorMsg }}</p>
        <div class="flex justify-end mt-2">
          <Button size="sm" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save API Key' }}
          </Button>
        </div>
      </form>
    </div>

    <div v-else>
      <p class="text-xs text-muted-foreground mb-3">
        A Forge API key is configured and stored encrypted. Clear it to enter a new one.
      </p>
      <div class="flex items-center gap-2">
        <Button variant="destructive" size="sm" @click="clearKey" :disabled="isClearing">
          {{ isClearing ? 'Clearing...' : 'Clear API Key' }}
        </Button>
        <Button v-if="showToggle" variant="outline" size="sm" @click="applicationStore.toggleForgeSectionEnabled()">
          {{ applicationStore.forgeSectionEnabled ? 'Disable' : 'Enable' }} Forge Section
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CryptoAPI, StorageAPI } from '@/lib/backend'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { Button } from '@/components/ui/button'

defineProps<{ showToggle?: boolean; bare?: boolean }>()
const emit = defineEmits<{ updated: [] }>()

const applicationStore = useApplicationStore()
const apiKey = ref('')
const hasKey = ref(false)
const isSaving = ref(false)
const isClearing = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  hasKey.value = await StorageAPI.Has('app.forgeApiKey')
})

async function saveKey() {
  isSaving.value = true
  errorMsg.value = ''
  try {
    const encrypted = await CryptoAPI.EncryptString(apiKey.value.trim())
    await StorageAPI.Set('app.forgeApiKey', encrypted)
    hasKey.value = true
    apiKey.value = ''
    emit('updated')
  } catch (e: any) {
    errorMsg.value = e?.message ?? 'Could not encrypt the API key.'
  } finally {
    isSaving.value = false
  }
}

async function clearKey() {
  isClearing.value = true
  try {
    await StorageAPI.Delete('app.forgeApiKey')
    hasKey.value = false
    emit('updated')
  } finally {
    isClearing.value = false
  }
}
</script>
