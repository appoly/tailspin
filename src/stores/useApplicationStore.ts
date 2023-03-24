import { defineStore } from "pinia";
import Store from "electron-store";
import { Connection } from "@/interfaces";

const persistentStore = new Store({ name: "application" });

export const useApplicationStore = defineStore("application", {
  state: () => ({
    connections: [] as Connection[],
    page: "connections",
  }),
  getters: {
    openConnections(): Connection[] {
      return this.connections.filter((c) => c.isOpen);
    },
  },
  actions: {
    init() {
      this.initConnections();
    },
    initConnections() {
      this.connections = persistentStore.get("connections", this.connections) as Connection[];
    },
    changePage(page: string) {
      this.page = page;
    },
    addConnection(connection: Connection) {
      this.connections.push(connection);
      persistentStore.set("connections", this.connections);
    },
    removeConnection(connection: Connection) {
      this.connections = this.connections.filter((c) => c.uid !== connection.uid);
      persistentStore.set("connections", this.connections);
    },
    goToConnection(connectionId: string) {
      this.page = "connections.page." + connectionId;
      this.setOpen(connectionId);
    },
    setOpen(connectionId: string) {
      const connection = this.connections.find((c) => c.uid === connectionId);
      if (connection) {
        connection.isOpen = true;
      }
    },
  },
});
