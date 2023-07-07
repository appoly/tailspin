<template>
    <div class=pb-4>
        <div class="alert alert-danger" role="alert" v-if="error">
            {{ error }}
        </div>
        <form @submit.prevent="saveConnection">
            <div class="d-flex gap-2">
                <div class="form-group">
                    <label class="form-label mb-0" for="icon">Icon</label>
                    <BootstrapIconPicker v-model="formFields.icon" v-model:color="formFields.iconColor" />
                </div>
                <div class="flex-grow-1 form-group">
                    <label class="form-label mb-0" for="connectionName">Connection Name</label>
                    <input type="text" class="form-control" id="connectionName" placeholder="Connection Name" required
                        v-model="formFields.name" />
                </div>
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
                <TheSshForm v-model="formFields.ssh" :isEdit="isEdit" :passwordIsChanged="passwordIsChanged"
                    @changePassword="handlePasswordChange" />

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
import { useConnectionStore } from '@/stores/useConnectionStore';
import { BaseConnection, Connection } from "@/interfaces";
import { computed, onMounted, ref, watch } from 'vue';
import BootstrapIconPicker from '@/components/BootstrapIconPicker/BootstrapIconPicker.vue';
import TheSshForm from '@/components/TheSshForm.vue';

const connectionStore = useConnectionStore();
const props = defineProps<{
    connection?: Connection;
}>();

const passwordIsChanged = ref(false);
const isEdit = computed(() => props.connection !== undefined);
const emit = defineEmits(['saved']);

const baseFormFields: BaseConnection = {
    name: '',
    icon: 'terminal',
    path: '',
    type: 'local' as 'remote' | 'local',
    ssh: {
        host: '',
        port: 22,
        username: '',
        passwordType: 'key',
        password: '',
    },
    iconColor: '#ffffff'
}

const formFields = ref<BaseConnection>({ ...baseFormFields })

onMounted(() => {
    if (isEdit.value) {
        console.log(props.connection);

        formFields.value = {
            name: props.connection!.name,
            icon: props.connection!.icon,
            path: props.connection!.path,
            type: props.connection!.type,
            ...(props.connection!.type === 'remote' && {
                ssh: {
                    host: props.connection!.ssh?.host || baseFormFields.ssh!.host,
                    port: props.connection!.ssh?.port || baseFormFields.ssh!.port,
                    username: props.connection!.ssh?.username || baseFormFields.ssh!.username,
                    passwordType: props.connection!.ssh?.passwordType || baseFormFields.ssh!.passwordType,
                    password: props.connection!.ssh?.password || baseFormFields.ssh!.password,
                }
            }),
            iconColor: props.connection!.iconColor || 'currentColor'
        }
    }
});

// Reset the ssh object when switching between local and remote
watch(() => formFields.value.type, () => {
    if (formFields.value.type === 'local') {
        formFields.value.ssh = {
            host: baseFormFields.ssh!.host,
            port: baseFormFields.ssh!.port,
            username: baseFormFields.ssh!.username,
            passwordType: baseFormFields.ssh!.passwordType,
            password: baseFormFields.ssh!.password,
        };
    }
});

// Reset the password field when switching between password and key
watch(() => formFields.value.ssh?.passwordType, () => {
    if (formFields.value?.ssh?.password) {
        formFields.value.ssh!.password = '';
    }
});

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
        iconColor: formFields.value.iconColor,
    };

    //  If it is remote connection, handle assigning of the ssh object, and handle encryption of password field
    if (formFields.value.type === 'remote') {
        newConnection.ssh = formFields.value.ssh;
        if (formFields.value.ssh?.passwordType === 'key') {
            // If password type is key (path), always set it...
            newConnection.ssh!.password = formFields.value.ssh!.password;
        }
        else if ((!isEdit.value || passwordIsChanged.value)) {
            // ...else if we are not editing, or the password is changed, encrypt the new password.
            newConnection.ssh!.password = await api.Application.encryptString(newConnection.ssh!.password);
        } else {   
            // ...else the password has not been changed, so use the old password.         
            newConnection.ssh!.password = props.connection!.ssh!.password;
        }
    }

    if (isEdit.value) {
        connectionStore.updateConnection({ ...newConnection, uid: props.connection!.uid });
        console.log('updated: ', newConnection);
        
    } else {
        connectionStore.addConnection(newConnection);
    }
    emit('saved');
}

async function handlePathSelection(type: 'file' | 'folder') {
    const result = await api.Application.openFileDialogue({ properties: [type === 'file' ? 'openFile' : 'openDirectory'] });
    if (result.filePaths[0]) {
        formFields.value.path = result.filePaths[0];
    }
}

function handlePasswordChange() {
    passwordIsChanged.value = true;
    formFields.value.ssh!.password = '';
}

</script>