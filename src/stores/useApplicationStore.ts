import { defineStore } from "pinia";
import Store from "electron-store";

const persistentStore = new Store({ name: "application" });

interface Connection {
  uid: string;
  name: string;
  path: string;
  type: "local" | "remote";
}

export const useApplicationStore = defineStore("user", {
  state: () => ({
    connections: [] as Connection[],
  }),
  actions: {
    init() {
      this.initConnections();
    },
    initConnections() {
      this.connections = persistentStore.get("connections", this.connections) as Connection[];
    },
  },
});
