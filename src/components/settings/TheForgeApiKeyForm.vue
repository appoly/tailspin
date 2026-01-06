<template>
    <div>
        <div class="form-group d-flex align-items-center gap-3 mb-2">
            <span>Enable Forge Section</span>
            <div class="btn-group flex-grow-1" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" class="btn-check" name="btnradio" id="btnradio1" autocomplete="off" :value="false"
                    v-model="applicationStore.forgeSectionEnabled" @click="applicationStore.toggleForgeSectionEnabled">
                <label class="btn btn-outline-primary" for="btnradio1">No</label>

                <input type="radio" class="btn-check" name="btnradio" id="btnradio2" autocomplete="off" :value="true"
                    v-model="applicationStore.forgeSectionEnabled" @click="applicationStore.toggleForgeSectionEnabled">
                <label class="btn btn-outline-primary" for="btnradio2">Yes</label>
            </div>
        </div>
        <div class="form-group">
            <label for="forge-api-key">
                Forge API Key
            </label>
            <div v-if="errorMsg" class="alert alert-danger" role="alert">
                {{ errorMsg }}
            </div>
            <template v-if="currentKeyExists">
                <button class="btn btn-outline-danger w-100" @click="clearKey">Clear current API Key</button>
                <small class="text-muted">Clicking this will clear the current API key. You can then enter a new
                    one.</small>
            </template>
            <template v-else>
                <textarea v-model="forgeApiKey" class="form-control" id="forge-api-key" placeholder="Forge API Key" />
                <small class="text-muted">
                    We can pull your sites from Forge using an API key. You can create one <a
                        href="https://forge.laravel.com/profile/api" target="_blank">here</a>.
                    <br>
                    <strong>Note:</strong> When creating your API token, make sure to select the <code>server:view</code> scope only.
                </small>
                <button class="btn btn-primary w-100 mt-2" @click="submitKey">Save</button>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApplicationStore } from '@/stores/useApplicationStore';
import { onMounted, ref } from 'vue';

const applicationStore = useApplicationStore();

/**
 * We do not want to show the actual API key if it is submitted, because it will be encrypted. Instead, allow the user to 'clear' the field.
 * They can then resubmit one. This works similarly to the password field on ssh connections.
 */
const forgeApiKey = ref('');
const currentKeyExists = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

onMounted(async () => {
    currentKeyExists.value = await api.Store.has('app.forgeApiKey');
})

const emit = defineEmits(['submit']);

async function clearKey() {
    await api.Store.deleteByKey('app.forgeApiKey');
    currentKeyExists.value = false;
}

async function submitKey() {
    isLoading.value = true;
    try {
        let encryptedKey = await api.Application.encryptString(forgeApiKey.value);
        await api.Store.set('app.forgeApiKey', encryptedKey);
        currentKeyExists.value = true;
        forgeApiKey.value = '';
        emit('submit');
    } catch (error: any) {
        errorMsg.value = error.message;
    } finally {
        isLoading.value = false;
    }
}

function changeForgeEnabled() {
    applicationStore.toggleForgeSectionEnabled();
}
</script>