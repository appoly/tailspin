<template>
    <div>
        <h1>Add Connection</h1>
        <div class="row">
            <div class="col-12 p-5">
                <div class="alert alert-danger" role="alert" v-if="error">
                    {{ error }}
                </div>
                <form @submit.prevent="saveConnection">
                    <div class="form-group">
                        <label for="connectionName">Connection name</label>
                        <input type="text" class="form-control" id="connectionName" placeholder="Connection name"
                            v-model="formFields.connectionName" />
                    </div>
                    <div class="form-group">
                        <label for="icon">Icon</label>
                        <BootstrapIconPicker v-model="formFields.icon" />
                    </div>
                    <div class="form-group">
                        <label for="path">Path</label>
                        <div class="input-group">
                            <button @click.prevent="() => handlePathSelection('file')" class="btn btn-secondary" type="button">Browse
                                File</button>
                            <input type="text" class="form-control" placeholder="Path" v-model="formFields.path"
                                aria-label="Path">
                            <button @click.prevent="() => handlePathSelection('folder')" class="btn btn-outline-secondary"
                                type="button">Browse
                                Folder</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="type">Type</label>
                        <select class="form-select" id="type" v-model="formFields.type">
                            <option value="remote">Remote</option>
                            <option value="local">Local</option>
                        </select>
                    </div>
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
import { ref } from 'vue';
import BootstrapIconPicker from '@/components/BootstrapIconPicker/BootstrapIconPicker.vue';

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const formFields = ref({
    connectionName: '',
    icon: 'book',
    path: '',
    type: 'local' as 'remote' | 'local',
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

    connectionStore.addConnection({
        uid,
        name: formFields.value.connectionName,
        icon: formFields.value.icon,
        path: formFields.value.path,
        type: formFields.value.type,
    });
    applicationStore.changePage('connections');
}

async function handlePathSelection(type: 'file' | 'folder') {
    const properties = type === 'file' ? ['openFile'] : ['openDirectory'];
    const result = await api.Application.openFileDialogue({ properties });
    if (result.filePaths[0]) {
        formFields.value.path = result.filePaths[0];
    }
}

</script>

<style scoped></style>