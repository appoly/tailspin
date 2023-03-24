import { defineStore } from "pinia";
import Store from "electron-store";

const persistentStore = new Store({ name: "application" });

interface Connection {
  uid: string;
  name: string;
  path: string;
  type: "local" | "remote";
}

export const useApplicationStore = defineStore("application", {
  state: () => ({
    connections: [] as Connection[],
    page: "connections",
  }),
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
  },
});
