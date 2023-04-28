<template>
    <div>
        <h1>Laravel Forge Connections</h1>

        <template v-if="!currentKeyExists">
            <div class="alert alert-warning" role="alert">
                <h4 class="alert-heading">No API Key</h4>
                <p>You have not yet set your Laravel Forge API key. You can do so below.</p>
            </div>
            <TheForgeApiKeyForm @submit="handleFormSubmit" />
        </template>
        <template v-else-if="forgeConnection.servers.length === 0">
            <div class="alert alert-warning" role="alert">
                <h4 class="alert-heading">No Servers</h4>
                <p>We could not find any servers associated with your API key. You can add one below.</p>
            </div>
            <TheForgeApiHandler />
        </template>
        <template v-else>
            <SearchBar v-model:search-term="searchTerm" placeholder="Search for a connection" />
            <div v-for="server in forgeConnection.servers" :key="server.id">
                <h4>{{ server.name }}</h4>
                <ul>
                    <pre>{{ sitesByServerId }}</pre>
                </ul>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import SearchBar from '@/components/SearchBar.vue';
import TheForgeApiKeyForm from '@/components/settings/TheForgeApiKeyForm.vue';
import TheForgeApiHandler from '@/components/forge/TheForgeApiHandler.vue';
import { computed, onMounted, ref } from 'vue';
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore';
import { ForgeSite } from "@/interfaces"

const forgeConnection = useForgeConnectionStore();

const currentKeyExists = ref(false);
const searchTerm = ref('');

// Group the array of site objects by their serverId property
const sitesByServerId = computed(() => {
    forgeConnection.sites.reduce((group, site) => {
        group[site.serverId] = group[site.serverId] || [];
        group[site.serverId].push(site);
        return group;
    }, {} as Record<number, ForgeSite[]>)
})

onMounted(async () => {
    currentKeyExists.value = await api.Store.has('forgeApiKey');
})

async function handleFormSubmit() {
    currentKeyExists.value = await api.Store.has('forgeApiKey');
}

</script>