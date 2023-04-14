<template>
    <div>
        <h1>Add Connection</h1>
        <div class="alert alert-danger" role="alert" v-if="error">
            {{ error }}
        </div>
        <form @submit.prevent="saveConnection">
            <div class="form-group mb-2">
                <label for="connectionName" class="form-label">Connection name</label>
                <input type="text" class="form-control" id="connectionName" placeholder="Connection name" required
                    v-model="formFields.name" />
            </div>
            <div class="form-group mb-2">
                <label class="form-label" for="icon">Icon</label>
                <BootstrapIconPicker v-model="formFields.icon" />
            </div>
            <div class="form-group my-4">
                <h4>Connection Type</h4>
                <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
                    <input type="radio" class="btn-check" id="radio-local" autocomplete="off" value="local"
                        v-model="formFields.type">
                    <label class="btn btn-outline-primary" for="radio-local">Local</label>
                    <input type="radio" class="btn-check" id="radio-remote" autocomplete="off" value="remote"
                        v-model="formFields.type" />
                    <label class="btn btn-outline-primary" for="radio-remote">Remote (SSH)</label>
                </div>
            </div>
            <template v-if="formFields.type === 'local'">
                <h4 class="my-2">Log File Details</h4>
                <div class="form-group mb-2">
                    <label class="form-label" for="path">Path</label>
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Path" v-model="formFields.path" required
                            aria-label="Path">
                        <button @click.prevent="() => handlePathSelection('file')" class="btn btn-secondary"
                            type="button">Browse
                            File</button>
                        <button @click.prevent="() => handlePathSelection('folder')" class="btn btn-outline-secondary"
                            type="button">Browse
                            Folder</button>
                    </div>
                </div>
            </template>
            <template v-else>
                <TheSshForm v-model="formFields.ssh" />

                <h4 class="my-2">Log File Details</h4>
                <div class="form-group mb-2">
                    <label class="form-label" for="path">Path</label>
                    <input type="text" class="form-control" v-model="formFields.path" required>
                    <small>Not sure what to put? Try
                        <pre class="d-inline">/var/www/storage/logs/laravel.log</pre>
                    </small>
                </div>
            </template>
            <div class="text-end">
                <button class="mt-3 btn btn-primary" type="submit">Save</button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { BaseConnection, Connection } from "@/interfaces";
import { ref } from 'vue';
import BootstrapIconPicker from '@/components/BootstrapIconPicker/BootstrapIconPicker.vue';
import TheSshForm from '@/components/TheSshForm.vue';

const props = defineProps<{
    connection?: Connection;
}>();

const emit = defineEmits(['saved']);

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const formFields = ref<BaseConnection>({
    name: '',
    icon: 'book',
    path: '',
    type: 'local' as 'remote' | 'local',
    ssh: {
        host: '',
        port: 22,
        username: '',
        passwordType: 'password',
        password: '',
    }
})
const error = ref('');

async function saveConnection() {
    let uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    error.value = '';

    // If any formfield is empty, return
    if (Object.values(formFields.value).some((value) => value === '')) {
        error.value = 'Please fill in all fields';
        return;
    }

    let newConnection: Connection = {
        uid,
        name: formFields.value.name,
        icon: formFields.value.icon,
        type: formFields.value.type,
        path: formFields.value.path,
    };

    //  If it is remote connection, handle assigning of the ssh object, and handle encryption of password field
    if (formFields.value.type === 'remote') {
        newConnection.ssh = formFields.value.ssh;
        newConnection.ssh!.password = await api.Application.encryptString(newConnection.ssh!.password);
    }
    connectionStore.addConnection(newConnection);
    emit('saved');
}

async function handlePathSelection(type: 'file' | 'folder') {
    const result = await api.Application.openFileDialogue({ properties: [type === 'file' ? 'openFile' : 'openDirectory'] });
    if (result.filePaths[0]) {
        formFields.value.path = result.filePaths[0];
    }
}

</script>