import { defineStore } from "pinia";
import { ForgeServer, ForgeSite } from "@/interfaces";
import { unproxify } from "@/helpers";

export const useForgeConnectionStore = defineStore("forgeConnection", {
  state: () => ({
    servers: [] as ForgeServer[],
    sites: [] as ForgeSite[],
  }),
  actions: {
    init() {
      this.initConnections();
    },
    async initConnections() {
      this.servers = (await api.Store.get("forge.servers", [])) as ForgeServer[];
      this.sites = (await api.Store.get("forge.sites", [])) as ForgeSite[];
    },
    async setSitesAndServers(sites: ForgeSite[], servers: ForgeServer[]) {
      // Update the store
      api.Store.set("forge", { servers, sites });
      // Then update the state
      this.servers = servers;
      this.sites = sites;
    },
  },
});
