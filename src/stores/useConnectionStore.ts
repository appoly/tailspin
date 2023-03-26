import { defineStore } from "pinia";
import { Connection } from "@/interfaces";
import { useApplicationStore } from "./useApplicationStore";
import { unproxify } from "@/helpers";

export const useConnectionStore = defineStore("connection", {
  state: () => ({
    connections: [] as Connection[],
  }),
  getters: {
    openConnections(): Connection[] {
      const applicationStore = useApplicationStore();
      return this.connections.filter((c) => applicationStore.openConnections.includes(c.uid));
    },
  },
  actions: {
    init() {
      this.initConnections();
    },
    async initConnections() {
      this.connections = (await api.Store.get("connections", unproxify(this.connections))) as Connection[];
    },
    getById(connectionId: string) {
      return this.connections.find((c) => c.uid === connectionId);
    },
    async addConnection(connection: Connection) {
      this.connections.push(connection);
      await api.Store.set("connections", this.connections);
    },
    removeConnection(connectionId: string) {
      this.connections = this.connections.filter((c) => c.uid !== connectionId);
      api.set("connections", this.connections);
      const applicationStore = useApplicationStore();
      applicationStore.closeConnection(connectionId);
    },
  },
});
