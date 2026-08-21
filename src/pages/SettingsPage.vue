<template>
  <div class="max-w-2xl">
    <header class="mb-6">
      <h1 class="text-lg font-semibold">Settings</h1>
      <p class="text-xs text-muted-foreground mt-0.5">Preferences are saved automatically.</p>
    </header>

    <!-- Appearance -->
    <section class="flex items-start gap-6 py-5">
      <div class="w-52 shrink-0">
        <h3 class="text-sm font-medium">Appearance</h3>
        <p class="text-xs text-muted-foreground mt-0.5">How the app looks on this machine.</p>
      </div>
      <div class="flex-1 min-w-0">
        <ToggleGroup
          type="single"
          variant="outline"
          :model-value="userStore.theme"
          @update:model-value="v => v && userStore.changeTheme(String(v))"
        >
          <ToggleGroupItem value="auto" class="text-xs px-3">Auto</ToggleGroupItem>
          <ToggleGroupItem value="light" class="text-xs px-3">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark" class="text-xs px-3">Dark</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </section>

    <Separator />

    <!-- SSH -->
    <section class="py-5 space-y-5">
      <div class="flex items-start gap-6">
        <div class="w-52 shrink-0">
          <h3 class="text-sm font-medium">Default private key</h3>
          <p class="text-xs text-muted-foreground mt-0.5">Pre-fills the key path on new SSH connections.</p>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <Input
              v-model="sshKeyPath"
              placeholder="~/.ssh/id_rsa"
              class="h-8 text-xs font-mono flex-1"
              @update:model-value="queueSaveKeyPath"
            />
            <Button variant="outline" size="sm" class="h-8" type="button" @click="browseSshKey">Browse</Button>
          </div>
          <SavedTick :visible="sshKeyPathSaved" />
        </div>
      </div>

      <div class="flex items-start gap-6">
        <div class="w-52 shrink-0">
          <h3 class="text-sm font-medium">Log fetch size</h3>
          <p class="text-xs text-muted-foreground mt-0.5">How much of a remote log is read per fetch.</p>
        </div>
        <div class="flex-1 min-w-0">
          <select
            :value="sshDefaultBytes"
            @change="saveSshDefaultBytes(($event.target as HTMLSelectElement).value)"
            class="h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option v-for="size in FileSizesInKb" :key="size" :value="size * 1024">
              {{ kilobytesToHumanReadableFileSize(size) }}
            </option>
          </select>
          <SavedTick :visible="sshBytesSaved" />
        </div>
      </div>
    </section>

    <Separator />

    <!-- Forge -->
    <section class="flex items-start gap-6 py-5">
      <div class="w-52 shrink-0">
        <h3 class="text-sm font-medium">Laravel Forge</h3>
        <p class="text-xs text-muted-foreground mt-0.5">Sync servers and sites straight from Forge.</p>
      </div>
      <div class="flex-1 min-w-0">
        <ForgeApiKeyForm :showToggle="true" bare />
      </div>
    </section>

    <Separator />

    <!-- Updates -->
    <section class="flex items-start gap-6 py-5">
      <div class="w-52 shrink-0">
        <h3 class="text-sm font-medium">Updates</h3>
        <p class="text-xs text-muted-foreground mt-0.5">Installed: v{{ updaterStore.currentVersion || appVersion }}</p>
      </div>
      <div class="flex-1 min-w-0">
        <div v-if="updaterStore.status === 'downloaded'" class="flex items-center gap-2">
          <Button size="sm" @click="updaterStore.install()">Restart to update</Button>
          <span class="text-xs text-muted-foreground">v{{ updaterStore.availableVersion }} is ready.</span>
        </div>
        <div v-else-if="updaterStore.status === 'available'" class="flex items-center gap-2">
          <Button size="sm" @click="updaterStore.download()">Download v{{ updaterStore.availableVersion }}</Button>
        </div>
        <div v-else-if="updaterStore.status === 'downloading'" class="text-xs text-muted-foreground">
          Downloading v{{ updaterStore.availableVersion }}... {{ updaterStore.progress }}%
        </div>
        <div v-else class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="updaterStore.status === 'checking'"
            @click="updaterStore.check()"
          >
            {{ updaterStore.status === 'checking' ? 'Checking...' : 'Check for updates' }}
          </Button>
          <span v-if="updaterStore.status === 'up-to-date'" class="text-xs text-muted-foreground">You're up to date.</span>
          <span v-else-if="updaterStore.status === 'error'" class="text-xs text-destructive">{{ updaterStore.errorMessage }}</span>
        </div>
      </div>
    </section>

    <!-- Danger Zone -->
    <section class="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 class="text-sm font-medium text-destructive">Danger zone</h3>
      <div class="mt-3 space-y-3">
        <div class="flex items-center justify-between gap-6">
          <p class="text-xs text-muted-foreground">Remove every saved connection, keeping other settings.</p>
          <Button variant="destructive" size="sm" class="shrink-0" @click="showDeleteConnectionsDialog = true">
            Delete connections
          </Button>
        </div>
        <div class="flex items-center justify-between gap-6">
          <p class="text-xs text-muted-foreground">Wipe all settings, connections and stored data.</p>
          <Button variant="destructive" size="sm" class="shrink-0" @click="showDeleteConfigDialog = true">
            Delete everything
          </Button>
        </div>
      </div>
    </section>

    <!-- Delete Connections Dialog -->
    <Dialog :open="showDeleteConnectionsDialog" @update:open="showDeleteConnectionsDialog = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete All Connections?</DialogTitle>
          <DialogDescription>This will permanently remove all saved connections. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" @click="showDeleteConnectionsDialog = false">Cancel</Button>
          <Button variant="destructive" size="sm" @click="deleteAllConnections">Delete</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Delete Config Dialog -->
    <Dialog :open="showDeleteConfigDialog" @update:open="showDeleteConfigDialog = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete All Config Data?</DialogTitle>
          <DialogDescription>This will remove all settings, connections, and stored data. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2">
          <Button variant="outline" size="sm" @click="showDeleteConfigDialog = false">Cancel</Button>
          <Button variant="destructive" size="sm" @click="deleteAllConfig">Delete</Button>
        </div>
      </DialogContent>
    </Dialog>

    <div class="text-xs text-muted-foreground text-center mt-10">
      Tailspin v{{ appVersion }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h, type FunctionalComponent } from 'vue'
import { StorageAPI, FileAPI } from '@/lib/backend'
import { useUserStore } from '@/stores/useUserStore'
import { useConnectionStore } from '@/stores/useConnectionStore'
import { useApplicationStore } from '@/stores/useApplicationStore'
import { useUpdaterStore } from '@/stores/useUpdaterStore'
import { FileSizesInKb } from '@/constants/Ssh'
import { kilobytesToHumanReadableFileSize, debounce } from '@/helpers'
import ForgeApiKeyForm from '@/components/ForgeApiKeyForm.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Check } from 'lucide-vue-next'

const userStore = useUserStore()
const connectionStore = useConnectionStore()
const applicationStore = useApplicationStore()
const updaterStore = useUpdaterStore()

const appVersion = APP_VERSION

const sshKeyPath = ref('')
const sshKeyPathSaved = ref(false)
const sshDefaultBytes = ref(500 * 1024)
const sshBytesSaved = ref(false)
const showDeleteConnectionsDialog = ref(false)
const showDeleteConfigDialog = ref(false)

// Transient "Saved" confirmation shown under a control
const SavedTick: FunctionalComponent<{ visible: boolean }> = (props) =>
  h(
    'p',
    {
      class: [
        'flex items-center gap-1 text-xs text-emerald-500 mt-1 transition-opacity duration-300',
        props.visible ? 'opacity-100' : 'opacity-0',
      ],
    },
    [h(Check, { class: 'h-3 w-3' }), 'Saved']
  )
SavedTick.props = { visible: { type: Boolean, required: true } }

onMounted(async () => {
  sshKeyPath.value = await StorageAPI.Get('app.sshKeyPath', '') as string
  sshDefaultBytes.value = await StorageAPI.Get('ssh.numberOfBytes', 500 * 1024) as number
})

const queueSaveKeyPath = debounce(saveSshKeyPath, 600)

async function saveSshKeyPath() {
  await StorageAPI.Set('app.sshKeyPath', sshKeyPath.value)
  await userStore.initDefaultSshPath()
  flash(sshKeyPathSaved)
}

async function browseSshKey() {
  const path = await FileAPI.OpenAnyFileDialog('Select SSH private key')
  if (path) {
    sshKeyPath.value = path
    await saveSshKeyPath()
  }
}

async function saveSshDefaultBytes(value: string) {
  sshDefaultBytes.value = Number(value)
  await StorageAPI.Set('ssh.numberOfBytes', sshDefaultBytes.value)
  flash(sshBytesSaved)
}

function flash(flag: { value: boolean }) {
  flag.value = true
  setTimeout(() => { flag.value = false }, 2000)
}

async function deleteAllConnections() {
  await connectionStore.deleteAllConnections()
  showDeleteConnectionsDialog.value = false
  applicationStore.changePage('connections', { success: 'All connections deleted.' })
}

async function deleteAllConfig() {
  await applicationStore.deleteAllConfigData()
  showDeleteConfigDialog.value = false
  applicationStore.changePage('connections', { success: 'All config data deleted.' })
}
</script>
