import { defineStore } from "pinia";
import Store from "electron-store";
import { Connection } from "@/interfaces";
import { useApplicationStore } from "./useApplicationStore";

const persistentStore = new Store({ name: "connection" });

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
    initConnections() {
      this.connections = persistentStore.get("connections", this.connections) as Connection[];
    },
    getById(connectionId: string) {
      return this.connections.find((c) => c.uid === connectionId);
    },
    addConnection(connection: Connection) {
      this.connections.push(connection);
      persistentStore.set("connections", this.connections);
    },
    removeConnection(connectionId: string) {
      this.connections = this.connections.filter((c) => c.uid !== connectionId);
      persistentStore.set("connections", this.connections);
      const applicationStore = useApplicationStore();
      applicationStore.closeConnection(connectionId);
    },
  },
});
