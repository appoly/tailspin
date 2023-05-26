import { defineStore } from "pinia";

export const useApplicationStore = defineStore("application", {
  state: () => ({
    openConnections: [] as string[],
    page: "connections",
    routeParams: {} as { [key: string]: string },
    canUseSafeStorage: false,
  }),
  actions: {
    async init() {
      this.canUseSafeStorage = await api.Application.canUseSafeStorage();
      this.page = this.canUseSafeStorage ? "connections" : "log-viewer";
    },
    changePage(page: string, params = {}) {
      this.routeParams = params;
      this.page = page;
    },
    addOpenConnection(connectionId: string) {
      this.openConnections.push(connectionId);
    },
    closeConnection(connectionId: string) {
      this.openConnections = this.openConnections.filter((c) => c !== connectionId);
    },
    closeAllConnections() {
      this.openConnections = [];
    },
    goToConnection(connectionId: string) {
      this.setOpen(connectionId);
      this.changePage("connections.page." + connectionId);
    },
    setOpen(connectionId: string) {
      this.openConnections.push(connectionId);
    },
  },
});
