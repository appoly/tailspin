<template>
    <div v-if="modelValue">
        <div class="card p-2">
            <div class="form-group">
                <label for="host">Host</label>
                <input class="form-control" type="text" v-model="modelValue.host" required />
            </div>
            <div class="form-group">
                <label for="port">Port</label>
                <input class="form-control" type="text" v-model="modelValue.port" required />
            </div>
            <div class="form-group">
                <label for="username">Username</label>
                <input class="form-control" type="text" v-model="modelValue.username" required />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input class="form-control" type="text" v-model="modelValue.password" required />
            </div>
            <div class="form-group">
                <label for="privateKeyPath">Private Key Path</label>
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="Path" v-model="modelValue.privateKeyPath" required
                        aria-label="Path">
                    <button @click.prevent="() => handlePathSelection()" class="btn btn-outline-secondary"
                        type="button">Browse</button>
                </div>
            </div>
            <div class="text-end mt-2">
                <button class="btn btn-secondary" type="button" @click="testConnection">Test Connection</button>
            </div>
        </div>
    </div>
    <div v-else>
        <p>Error: Model value is undefined - how did you get here?</p>
    </div>
</template>

<script setup lang="ts">
import { SshDetails } from '@/interfaces';
import { computed } from 'vue';

const props = defineProps<{ modelValue?: SshDetails }>();
const emit = defineEmits(['update:modelValue']);

computed({
    get() {
        return props.modelValue
    },
    set(value) {
        emit('update:modelValue', value)
    }
})

async function handlePathSelection() {
    const result = await api.Application.openFileDialogue({ properties: ['openFile'] });
    if (result.filePaths[0]) {
        props.modelValue!.privateKeyPath = result.filePaths[0];
    }
}

function testConnection() {
    console.log('test connection')
}
</script>