<template>
  <form @submit.prevent="handleSave" class="space-y-4">
    <div class="flex items-end gap-2">
      <ConnectionIconPicker
        v-model="form.icon"
        :color="form.iconColor"
        @update:color="form.iconColor = $event"
      />
      <div class="flex-1">
        <label class="text-xs text-muted-foreground mb-1 block">Connection Name</label>
        <Input v-model="form.name" placeholder="My Connection" class="h-8 text-sm" required />
      </div>
    </div>

    <div>
      <label class="text-xs text-muted-foreground mb-1 block">Type</label>
      <ToggleGroup
        type="single"
        :model-value="form.type"
        @update:model-value="(val: any) => { if (val) handleTypeChange(val as 'local' | 'remote') }"
        class="justify-start"
      >
        <ToggleGroupItem value="local" class="h-7 text-xs px-3">Local</ToggleGroupItem>
        <ToggleGroupItem value="remote" class="h-7 text-xs px-3">Remote (SSH)</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <template v-if="form.type === 'local'">
      <div>
        <label class="text-xs text-muted-foreground mb-1 block">Path</label>
        <div class="flex gap-1.5">
          <Input v-model="form.path" placeholder="/var/log/laravel.log" class="h-8 text-sm flex-1" required />
          <Button variant="outline" size="sm" class="h-8 text-xs" type="button" @click="browseFile">File</Button>
          <Button variant="outline" size="sm" class="h-8 text-xs" type="button" @click="browseFolder">Folder</Button>
        </div>
      </div>
    </template>

    <template v-else>
      <ConnectionSshForm
        v-model="sshDetails"
        :is-edit="isEdit"
        :password-is-changed="passwordIsChanged"
        :default-ssh-path="userStore.defaultSshPath"
        @change-password="passwordIsChanged = true"
      />
      <div>
        <label class="text-xs text-muted-foreground mb-1 block">Remote Log Path</label>
        <Input v-model="form.path" placeholder="/home/forge/site.com/storage/logs/laravel.log" class="h-8 text-sm" required />
        <p class="text-[11px] text-muted-foreground mt-1">Full path to the log file or directory on the remote server.</p>
      </div>
    </template>

    <div class="flex justify-end pt-2">
      <Button type="submit" size="sm" class="h-8 text-xs" :disabled="saving">
        <Loader2 v-if="saving" class="h-3.5 w-3.5 mr-1.5 animate-spin" />
        {{ isEdit ? 'Update Connection' : 'Save Connection' }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { Connection, BaseConnection, SshDetails } from '@/types/interfaces'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useUserStore } from '@/stores/useUserStore'
import { CryptoAPI, FileAPI } from '@/lib/backend'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Loader2 } from 'lucide-vue-next'
import ConnectionIconPicker from './ConnectionIconPicker.vue'
import ConnectionSshForm from './ConnectionSshForm.vue'

const props = defineProps<{
  connection?: Connection
  initialValues?: BaseConnection
}>()

const connectionStore = useConnectionStore()
const applicationStore = useApplicationStore()
const userStore = useUserStore()

const isEdit = computed(() => !!props.connection)
const passwordIsChanged = ref(false)
const saving = ref(false)

const defaults = props.connection || props.initialValues

const form = reactive({
  name: defaults?.name || '',
  icon: defaults?.icon || 'terminal',
  iconColor: defaults?.iconColor || '#a1a1aa',
  path: defaults?.path || '',
  type: (defaults?.type || 'local') as 'local' | 'remote',
  isFavorite: defaults?.isFavorite || false,
})

const sshDetails = ref<SshDetails>({
  host: defaults?.ssh?.host || '',
  port: defaults?.ssh?.port || 22,
  username: defaults?.ssh?.username || '',
  passwordType: defaults?.ssh?.passwordType || 'key',
  password: defaults?.ssh?.password || '',
  passphraseRequired: defaults?.ssh?.passphraseRequired || false,
})

function handleTypeChange(type: 'local' | 'remote') {
  form.type = type
  if (type === 'local') {
    sshDetails.value = {
      host: '', port: 22, username: '', passwordType: 'key', password: '', passphraseRequired: false,
    }
  }
}

async function browseFile() {
  const path = await FileAPI.OpenFileDialog()
  if (path) form.path = path
}

async function browseFolder() {
  const path = await FileAPI.OpenDirectoryDialog()
  if (path) form.path = path
}

function generateUid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

async function handleSave() {
  saving.value = true
  try {
    let ssh: SshDetails | undefined
    if (form.type === 'remote') {
      ssh = { ...sshDetails.value }
      if (ssh.passwordType === 'password' && ssh.password && (passwordIsChanged.value || !isEdit.value)) {
        ssh.password = await CryptoAPI.EncryptString(ssh.password)
      }
    }

    const connection: Connection = {
      uid: props.connection?.uid || generateUid(),
      name: form.name,
      icon: form.icon,
      iconColor: form.iconColor,
      path: form.path,
      type: form.type,
      isFavorite: form.isFavorite,
      ...(ssh ? { ssh } : {}),
    }

    if (isEdit.value) {
      await connectionStore.updateConnection(connection)
    } else {
      await connectionStore.addConnection(connection)
    }

    applicationStore.changePage('connections', {
      success: isEdit.value ? 'Connection updated successfully.' : 'Connection added successfully.',
    })
  } finally {
    saving.value = false
  }
}
</script>
