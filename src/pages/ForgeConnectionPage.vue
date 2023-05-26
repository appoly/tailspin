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
        <template v-else-if="!connection">
            <div>
                <TheForgeApiHandler />
                <SearchBar v-model:search-term="searchTerm" placeholder="Search for a Site" />
                <div class="my-3">
                    <div v-for="server in forgeConnection.servers" :key="'server' + server.id">
                        <template v-if="Object.keys(sitesByServerId[server.id] ?? {}).length">
                            <h4>{{ server.name }}</h4>
                            <ul>
                                <li v-for="site in sitesByServerId[server.id]" :key="`site-${server.id}-${site.id}`">
                                    <button class="btn btn-link btn-sm" @click="() => selectSite(site, server)">
                                        <span>{{ site.name }}</span>
                                    </button>
                                </li>
                            </ul>
                        </template>
                    </div>
                </div>
            </div>
        </template>
        <button v-if="connection" class="btn btn-secondary" @click="() => connection = undefined">&lArr; Back to
            Sites List</button>
        <SshLogViewer v-if="connection" :connection="connection" />
    </div>
</template>

<script setup lang="ts">
import SearchBar from '@/components/SearchBar.vue';
import TheForgeApiKeyForm from '@/components/settings/TheForgeApiKeyForm.vue';
import TheForgeApiHandler from '@/components/forge/TheForgeApiHandler.vue';
import { computed, onMounted, ref } from 'vue';
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore';
import { Connection, ForgeServer, ForgeSite } from "@/interfaces"
import SshLogViewer from '@/components/SshLogViewer.vue';

const forgeConnection = useForgeConnectionStore();

const currentKeyExists = ref(false);
const searchTerm = ref('');

const filteredSites = computed(() => {
    return forgeConnection.sites.filter((site) => {
        return site.name.toLowerCase().includes(searchTerm.value.toLowerCase());
    });
});

// Group the array of site objects by their serverId property
const sitesByServerId = computed(() => {
    return filteredSites.value.reduce((group, site) => {
        group[site.serverId] = group[site.serverId] || [];
        group[site.serverId].push(site);
        return group;
    }, {} as Record<number, ForgeSite[]>)
});

onMounted(async () => {
    currentKeyExists.value = await api.Store.has('forgeApiKey');
})

async function handleFormSubmit() {
    currentKeyExists.value = await api.Store.has('forgeApiKey');
}

// Hacky for now as a POC
const connection = ref<Connection>();
const hideSelector = ref(false);
async function selectSite(site: ForgeSite, server: ForgeServer) {
    const sshKeyPath = await api.Store.get('sshKeyPath', '');
    if (!sshKeyPath) {
        alert('You must set your SSH key path in the settings first.');
        return;
    }
    connection.value = {
        name: site.name,
        icon: 'server',
        path: '~/' + site.name + '/storage/logs',
        type: 'remote',
        ssh: {
            host: server.ipAddress,
            username: site.username,
            port: 22,
            passwordType: 'key',
            password: await api.Application.encryptString(sshKeyPath),

        },
        isFavorite: false,
        iconColor: 'blue',
        uid: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    }
}
</script>