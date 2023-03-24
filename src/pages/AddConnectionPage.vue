<template>
    <div>
        <h1>Add Connection</h1>
        <div class="row">
            <div class="col-12 p-5">
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

const applicationStore = useApplicationStore();

const formFields = {
    connectionName: '',
    icon: '',
    path: '',
    type: 'local' as 'remote' | 'local',
}

function saveConnection() {
    let uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    applicationStore.addConnection({
        uid,
        name: formFields.connectionName,
        icon: formFields.icon,
        path: formFields.path,
        type: formFields.type,
    });
    applicationStore.changePage('connections');
}

</script>

<style scoped></style>