<template>
    <div>
        <h1>Add Connection</h1>
        <div class="row">
            <div class="col-12 p-5">
                <div class="alert alert-danger" role="alert" v-if="error">
                    {{ error }}
                </div>
                <div class="form-group">
                    <label for="connectionName">Connection name</label>
                    <input type="text" class="form-control" id="connectionName" placeholder="Connection name"
                        v-model="formFields.connectionName" />
                </div>
                <div class="form-group">
                    <label for="icon">Icon</label>
                    <input type="text" class="form-control" id="icon" placeholder="Icon" v-model="formFields.icon" />
                </div>
                <div class="form-group">
                    <label for="path">Path</label>
                    <input type="text" class="form-control" id="path" placeholder="Path" v-model="formFields.path" />
                </div>
                <div class="form-group">
                    <label for="type">Type</label>
                    <select class="form-select" id="type" v-model="formFields.type">
                        <option value="remote">Remote</option>
                        <option value="local">Local</option>
                    </select>
                </div>
                <div class="text-end">
                    <button class="mt-3 btn btn-primary" @click="saveConnection">Save</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { ref } from 'vue';

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const formFields = ref({
    connectionName: '',
    icon: '',
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

</script>

<style scoped></style>