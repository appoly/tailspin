<template>
    <div class="form-group my-4">
        <label for="forge-api-key">
            Forge API Key
        </label>
        <div v-if="errorMsg" class="alert alert-danger" role="alert">
            {{ errorMsg }}
        </div>
        <template v-if="currentKeyExists">
            <button class="btn btn-outline-danger w-100" @click="clearKey">Clear current API Key</button>
            <small class="text-muted">Clicking this will clear the current API key. You can then enter a new one.</small>
        </template>
        <template v-else>
            <textarea v-model="forgeApiKey" class="form-control" id="forge-api-key" placeholder="Forge API Key" />
            <small class="text-muted">
                We can pull your sites from Forge using an API key. You can create one <a
                    href="https://forge.laravel.com/user-profile/api" target="_blank">here</a>.
            </small>
            <button class="btn btn-primary w-100 mt-2" @click="submitKey">Save</button>

        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

/**
 * We do not want to show the actual API key if it is submitted, because it will be encrypted. Instead, allow the user to 'clear' the field.
 * They can then resubmit one. This works similarly to the password field on ssh connections.
 */
const forgeApiKey = ref('');
const currentKeyExists = ref(false);
const isLoading = ref(false);
const errorMsg = ref('');

onMounted(async () => {
    currentKeyExists.value = await api.Store.has('forgeApiKey');
})

async function clearKey() {
    await api.Store.deleteByKey('forgeApiKey');
    currentKeyExists.value = false;
}

async function submitKey() {
    isLoading.value = true;
    try {
        await api.Application.encryptString(forgeApiKey.value);
        await api.Store.set('forgeApiKey', forgeApiKey.value);
        currentKeyExists.value = true;
    } catch (error: any) {
        errorMsg.value = error.message;
    } finally {
        isLoading.value = false;
    }
}

</script>