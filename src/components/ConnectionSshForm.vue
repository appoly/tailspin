<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="text-xs text-muted-foreground mb-1 block">Host</label>
        <Input
          :model-value="modelValue.host"
          @update:model-value="update('host', $event)"
          placeholder="192.168.1.1"
          class="h-8 text-sm"
        />
      </div>
      <div>
        <label class="text-xs text-muted-foreground mb-1 block">Port</label>
        <Input
          :model-value="String(modelValue.port)"
          @update:model-value="update('port', Number($event))"
          type="number"
          placeholder="22"
          class="h-8 text-sm"
        />
      </div>
    </div>

    <div>
      <label class="text-xs text-muted-foreground mb-1 block">Username</label>
      <Input
        :model-value="modelValue.username"
        @update:model-value="update('username', $event)"
        placeholder="root"
        class="h-8 text-sm"
      />
    </div>

    <div>
      <label class="text-xs text-muted-foreground mb-1 block">Authentication</label>
      <ToggleGroup
        type="single"
        :model-value="modelValue.passwordType"
        @update:model-value="(val: any) => { if (val) update('passwordType', val) }"
        class="justify-start"
      >
        <ToggleGroupItem value="key" class="h-7 text-xs px-3">Private Key</ToggleGroupItem>
        <ToggleGroupItem value="password" class="h-7 text-xs px-3">Password</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <template v-if="modelValue.passwordType === 'key'">
      <div>
        <label class="text-xs text-muted-foreground mb-1 block">Private Key Path</label>
        <div class="flex gap-1.5">
          <Input
            :model-value="modelValue.password"
            @update:model-value="update('password', $event)"
            placeholder="~/.ssh/id_rsa"
            class="h-8 text-sm flex-1"
          />
          <Button variant="outline" size="sm" class="h-8 text-xs" type="button" @click="browseKeyFile">
            Browse
          </Button>
        </div>
        <button
          v-if="defaultSshPath"
          class="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
          @click="update('password', defaultSshPath)"
        >
          Use default SSH key
        </button>
      </div>

      <div class="flex items-center gap-2">
        <input
          type="checkbox"
          :checked="modelValue.passphraseRequired"
          @change="update('passphraseRequired', ($event.target as HTMLInputElement).checked)"
          class="rounded border-border"
          id="passphrase-required"
        />
        <label for="passphrase-required" class="text-xs text-muted-foreground cursor-pointer">
          Passphrase required
        </label>
      </div>
    </template>

    <template v-else>
      <div v-if="isEdit && !passwordIsChanged">
        <Button variant="outline" size="sm" class="h-8 text-xs" type="button" @click="$emit('changePassword')">
          Change Password
        </Button>
      </div>
      <div v-else>
        <label class="text-xs text-muted-foreground mb-1 block">Password</label>
        <Input
          :model-value="modelValue.password"
          @update:model-value="update('password', $event)"
          type="password"
          placeholder="Enter password"
          class="h-8 text-sm"
        />
      </div>
    </template>

    <div class="pt-1">
      <Button
        variant="outline"
        size="sm"
        class="h-8 text-xs"
        type="button"
        :disabled="testingConnection"
        @click="testConnection"
      >
        <component :is="testingConnection ? Loader2 : Wifi" class="h-3.5 w-3.5 mr-1.5" :class="testingConnection ? 'animate-spin' : ''" />
        Test Connection
      </Button>
      <p v-if="testResult" class="text-xs mt-1.5" :class="testResult.success ? 'text-emerald-500' : 'text-destructive'">
        {{ testResult.message || (testResult.success ? 'Connection successful' : 'Connection failed') }}
      </p>
    </div>

    <ConnectionSshPassphraseDialog
      v-model:open="passphraseDialogOpen"
      @submit="handlePassphraseSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SshDetails, SshResponse } from '@/types/interfaces'
import { SshAPI } from '@/lib/backend'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Wifi, Loader2 } from 'lucide-vue-next'
import { FileAPI } from '@/lib/backend'
import ConnectionSshPassphraseDialog from './ConnectionSshPassphraseDialog.vue'

const props = defineProps<{
  modelValue: SshDetails
  isEdit?: boolean
  passwordIsChanged?: boolean
  defaultSshPath?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SshDetails]
  'changePassword': []
}>()

const testingConnection = ref(false)
const testResult = ref<SshResponse | null>(null)
const passphraseDialogOpen = ref(false)

function update(key: string, value: any) {
  testResult.value = null
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

async function browseKeyFile() {
  const path = await FileAPI.OpenAnyFileDialog('Select SSH private key')
  if (path) update('password', path)
}

async function testConnection() {
  if (props.modelValue.passphraseRequired && props.modelValue.passwordType === 'key') {
    passphraseDialogOpen.value = true
    return
  }
  await runTest()
}

async function handlePassphraseSubmit(passphrase: string) {
  await runTest(passphrase)
}

async function runTest(passphrase?: string) {
  testingConnection.value = true
  testResult.value = null
  try {
    testResult.value = await SshAPI.TestConnection({
      ...props.modelValue,
      passphrase,
    })
  } catch (e: any) {
    testResult.value = { success: false, message: e?.message || 'Connection failed' }
  } finally {
    testingConnection.value = false
  }
}
</script>
