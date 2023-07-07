<template>
    <div>
        <div v-if="errorMsg" class="alert alert-danger my-2" role="alert">
            {{ errorMsg }}
        </div>
        <div class="d-flex justify-content-between">
            <button @click="queryForge" :disabled="isLoading" class="btn btn-primary">
                <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span v-else>Sync Forge Sites</span>
            </button>
            <button @click="clearSites" :disabled="isLoading" class="btn btn-danger">
                <span>Clear List</span>
            </button>
        </div>
        <pre>{{ test }}</pre>
    </div>
</template>

<script setup lang="ts">
import { unproxify } from '@/helpers';
import { ref } from 'vue';
import { ForgeServer, ForgeSite } from '$/interfaces';
import { useForgeConnectionStore } from '@/stores/useForgeConnectionStore';

const forgeStore = useForgeConnectionStore();
const isLoading = ref(false);
const errorMsg = ref('');
const encryptedApiKey = ref('');
const test = ref();

async function queryForge() {
    isLoading.value = true;
    try {
        encryptedApiKey.value = await api.Store.get('app.forgeApiKey', '');
        if (!encryptedApiKey.value) {
            throw new Error('No API key set');
        }

        const [serverResponse, siteResponse] = await Promise.all([
            api.Forge.getServerList(unproxify(encryptedApiKey.value)),
            api.Forge.getSiteList(unproxify(encryptedApiKey.value)),
        ]);

        // If any have an error response, throw an error
        if (serverResponse.error || siteResponse.error) {
            throw new Error(serverResponse.error ?? siteResponse.error);
        }

        let servers = mapServers(serverResponse.servers) as ForgeServer[];
        let sites = mapSites(siteResponse.sites) as ForgeSite[];

        // Then store these:
        forgeStore.setSitesAndServers(sites, servers);
    } catch (error: any) {
        console.log(error);

        errorMsg.value = error.message ?? 'An unknown error occurred';
    } finally {
        isLoading.value = false;
    }
}

function mapServers(servers: ForgeServerResponse[]): ForgeServer[] {
    return servers.map((server) => ({
        id: server.id,
        name: server.name,
        ipAddress: server.ip_address,
    }));
}

function mapSites(sites: ForgeSiteResponse[]): ForgeSite[] {
    return sites.map((site) => ({
        id: site.id,
        name: site.name,
        username: site.username,
        serverId: site.server_id,
    }));
}

function clearSites() {
    if (confirm('This will clear all sites and servers from the Laravel Log Viewer. Are you sure?')) {
        forgeStore.clearSitesAndServers();
    }
}

interface ForgeServerResponse {
    id: number;
    name: string;
    ip_address: string;
    // And more that we don't care about
}

interface ForgeSiteResponse {
    id: number;
    name: string;
    username: string;
    server_id: number;
    // And more that we don't care about
}
</script>