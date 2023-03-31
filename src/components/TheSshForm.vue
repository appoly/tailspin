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
            <div class="btn-group mt-2" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" class="btn-check" id="radio-password" autocomplete="off" value="password"
                    v-model="passwordType">
                <label class="btn btn-outline-primary" for="radio-password">Password</label>
                <input type="radio" class="btn-check" id="radio-key" autocomplete="off" value="key"
                    v-model="passwordType" />
                <label class="btn btn-outline-primary" for="radio-key">Private Key</label>
            </div>
            <div v-if="passwordType === 'password'" class="form-group">
                <label for="password">Password</label>
                <input class="form-control" type="password" v-model="modelValue.password" required />
            </div>
            <div v-else-if="passwordType === 'key'" class="form-group">
                <label for="privateKeyPath">Private Key Path</label>
                <div class="input-group">
                    <input type="text" class="form-control" placeholder="Path" v-model="modelValue.password" required
                        aria-label="Path">
                    <button @click.prevent="() => handlePathSelection()" class="btn btn-outline-secondary"
                        type="button">Browse</button>
                </div>
            </div>
            <div class="text-end mt-2">
                <button class="btn btn-secondary" type="button" @click="testConnection" :disabled="!isReady || isTesting">
                    <span v-if="isTesting">Testing...</span>
                    <span v-else>Test Connection</span>
                </button>
                <small v-if="errorMsg" class="text-danger d-block">{{ errorMsg }}</small>
                <small v-if="testSuccess" class="text-success d-block">Connection successful</small>
            </div>
        </div>
    </div>
    <div v-else>
        <p>Error: Model value is undefined - how did you get here?</p>
    </div>
</template>

<script setup lang="ts">
import { unproxify } from '@/helpers';
import { SshDetails } from '@/interfaces';
import { computed, ref } from 'vue';

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

const passwordType = ref<'password' | 'key'>('password');

async function handlePathSelection() {
    const result = await api.Application.openFileDialogue({ properties: ['openFile'] });
    if (result.filePaths[0] && passwordType.value === 'key') {
        props.modelValue!.password = result.filePaths[0];
    }
}

const isReady = computed(() => (
    props.modelValue !== undefined &&
    props.modelValue.host &&
    props.modelValue.port &&
    props.modelValue.username &&
    props.modelValue.password
))

const isTesting = ref(false);
const testSuccess = ref(false);
const errorMsg = ref('');
async function testConnection() {
    if (!isReady.value) {
        errorMsg.value = 'Please fill out all fields';
        return;
    }
    isTesting.value = true;
    testSuccess.value = false;
    errorMsg.value = '';
    try {
        let response = await api.Ssh.testSshCredentials(unproxify(props.modelValue!));
        if (response.success) {
            testSuccess.value = true;
        } else {
            errorMsg.value = "Connection failed."
            errorMsg.value += response.error ? ` Error: ${response.error}` : '';
        }
    } catch (err: any) {
        errorMsg.value = err?.message ?? 'An unexpected error has occurred';
    } finally {
        isTesting.value = false;
    }
}
</script>