<template>
    <div>
        <h1>Add Connection</h1>
        <div class="row">
            <div class="col-12 p-5">
                <div class="alert alert-danger" role="alert" v-if="error">
                    {{ error }}
                </div>
                <form @submit.prevent="saveConnection">
                    <div class="form-group mb-2">
                        <label for="connectionName">Connection name</label>
                        <input type="text" class="form-control" id="connectionName" placeholder="Connection name" required
                            v-model="formFields.name" />
                    </div>
                    <div class="form-group mb-2">
                        <label for="icon">Icon</label>
                        <BootstrapIconPicker v-model="formFields.icon" />
                    </div>
                    <div class="form-group mb-2">
                        <div>Connection Type</div>
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
                        <div class="form-group mb-2">
                            <label for="path">Path</label>
                            <div class="input-group">
                                <button @click.prevent="() => handlePathSelection('file')" class="btn btn-secondary"
                                    type="button">Browse
                                    File</button>
                                <input type="text" class="form-control" placeholder="Path" v-model="formFields.path" required
                                    aria-label="Path">
                                <button @click.prevent="() => handlePathSelection('folder')"
                                    class="btn btn-outline-secondary" type="button">Browse
                                    Folder</button>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        REMOTE FIELDS HERE!!
                    </template>
                    <div class="text-end">
                        <button class="mt-3 btn btn-primary" type="submit">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { BaseConnection, Connection } from "@/interfaces";
import { ref } from 'vue';
import BootstrapIconPicker from '@/components/BootstrapIconPicker/BootstrapIconPicker.vue';

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
        password: '',
        privateKeyPath: '',
    }
})
const error = ref('');

function saveConnection() {
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

    if (formFields.value.type === 'remote') {
        newConnection.ssh = formFields.value.ssh;
    }

    connectionStore.addConnection(newConnection);
    applicationStore.changePage('connections');
}

async function handlePathSelection(type: 'file' | 'folder') {
    const result = await api.Application.openFileDialogue({ properties: [type === 'file' ? 'openFile' : 'openDirectory'] });
    if (result.filePaths[0]) {
        formFields.value.path = result.filePaths[0];
    }
}

</script>

<style scoped></style>