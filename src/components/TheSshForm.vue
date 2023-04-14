<template>
    <div>
        <div v-if="modelValue">
            <div class="card p-2">
                <h4>Connection Details</h4>
                <div class="form-group mb-2">
                    <label class="form-label" for="host">Host</label>
                    <input class="form-control" type="text" v-model="modelValue.host" required placeholder="127.0.0.1" />
                </div>
                <div class="form-group mb-2">
                    <label class="form-label" for="port">Port</label>
                    <input class="form-control" type="text" v-model="modelValue.port" required placeholder="22" />
                </div>
                <hr>
                <h4>Authentication</h4>
                <div class="btn-group my-4" role="group" aria-label="Basic radio toggle button group">
                    <input type="radio" class="btn-check" id="radio-password" autocomplete="off" value="password"
                        :disabled="isEdit && !passwordIsChanged" v-model="modelValue.passwordType">
                    <label class="btn btn-outline-primary" for="radio-password">Password</label>
                    <input type="radio" class="btn-check" id="radio-key" autocomplete="off" value="key"
                        :disabled="isEdit && !passwordIsChanged" v-model="modelValue.passwordType" />
                    <label class="btn btn-outline-primary" for="radio-key">Private Key</label>
                </div>
                <div class="form-group mb-2">
                    <label class="form-label" for="username">Username</label>
                    <input class="form-control" type="text" v-model="modelValue.username" required />
                </div>
                <template v-if="isEdit && !passwordIsChanged">
                    <button @click.prevent="changePassword" class="btn btn-outline-danger" type="button">Change
                        Password/Private Key Path</button>
                    <small>Clicking this will override the current value for the Password/Private Key
                        Path</small>
                </template>
                <template v-else>
                    <div v-if="modelValue.passwordType === 'password'" class="form-group mb-2">
                        <label class="form-label" for="password">Password</label>
                        <input class="form-control" type="password" v-model="modelValue.password" required />
                    </div>
                    <template v-else-if="modelValue.passwordType === 'key'">
                        <div class="form-group mb-2">
                            <label class="form-label" for="privateKeyPath">Private Key Path</label>
                            <div class="input-group">
                                <input type="text" class="form-control" placeholder="Path" v-model="modelValue.password"
                                    required aria-label="Path">
                                <button @click.prevent="() => handlePathSelection()" class="btn btn-outline-secondary"
                                    type="button">Browse</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="passphraseRequired">Passphrase Required</label>
                            <div>
                                <div class="btn-group" role="group">
                                    <input type="checkbox" class="btn-check" id="passphraseRequired" autocomplete="off"
                                        value="passphraseRequired" v-model="modelValue.passphraseRequired">
                                    <label class="btn btn-outline-primary" for="passphraseRequired">
                                        {{ modelValue.passphraseRequired ? 'Yes' : 'No' }}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </template>
                </template>
                <div class="text-end my-2">
                    <button class="btn btn-secondary" type="button" @click="testConnection"
                        :disabled="!isReady || isTesting">
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
        <div id="myModal" class="modal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Enter Passphrase</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="input-group">
                            <input type="password" class="form-control" placeholder="Passphrase" v-model="passphrase"
                                required aria-label="Passphrase">
                            <button class="btn btn-secondary" type="button" data-bs-dismiss="modal">Go</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { unproxify } from '@/helpers';
import { SshDetails } from '@/interfaces';
import { computed, ref } from 'vue';
import { Modal } from 'bootstrap';

const props = withDefaults(defineProps<{ modelValue?: SshDetails, isEdit: boolean, passwordIsChanged: boolean }>(), {
    isEdit: false,
    passwordIsChanged: false,
});
const emit = defineEmits(['update:modelValue', 'changePassword']);

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
    if (result.filePaths[0] && props.modelValue!.passwordType === 'key') {
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
const passphrase = ref('');
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
        let options = unproxify(props.modelValue!);
        if (props.modelValue!.passphraseRequired  && !passphrase.value) {
            const myModalAlternative = new Modal('#myModal', options)
            myModalAlternative.show()
            return;
            // Ask here with a modal?
            const passphrase = window.prompt('Please enter the passphrase for the private key');
            if (!passphrase) {
                return;
            }
            options.passphrase = passphrase;
        }
        let response = await api.Ssh.testSshCredentials(unproxify(props.modelValue!));
        if (response.success) {
            testSuccess.value = true;
            alert('Connection successful');
        } else {
            errorMsg.value = "Connection failed."
            errorMsg.value += response.error ? ` Error: ${response.error}` : '';
            alert(errorMsg.value);
        }
    } catch (err: any) {
        errorMsg.value = err?.message ?? 'An unexpected error has occurred';
        alert(errorMsg.value);
    } finally {
        isTesting.value = false;
    }
}

function changePassword() {
    window.confirm('Are you sure you want to change the password/private key path?') && emit('changePassword');
}
</script>