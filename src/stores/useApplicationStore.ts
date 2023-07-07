import { Download } from "$/interfaces";
import { defineStore } from "pinia";

export const useApplicationStore = defineStore("application", {
  state: () => ({
    openConnections: [] as string[],
    page: "connections",
    routeParams: {} as { [key: string]: string },
    canUseSafeStorage: false,
    downloads: [] as Download[],
    forgeSectionEnabled: false,
  }),
  actions: {
    async init() {
      this.canUseSafeStorage = await api.Application.canUseSafeStorage();
      this.page = this.canUseSafeStorage ? "connections" : "log-viewer";
      this.initForgeSectionEnabled();
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
    updateDownloads(item: string, status: "completed" | "failed" | "inProgress") {
      let download = this.downloads.find((d) => d.name === item);
      // If it is an inProgress request and the item is already in the inProgress list, return false:
      if (status === "inProgress" && download && download.type === "inProgress") {
        return false;
      }
      // Create the entry if it doesn't exist, otherwise update it:
      if (!download) {
        this.downloads.push({ name: item, type: status, date: new Date() });
      } else {
        download.type = status;
        download.date = new Date();
      }
      return true;
    },
    async initForgeSectionEnabled() {
      this.forgeSectionEnabled = (await api.Store.get("app.forgeEnabled", true)) !== false; // Default to true
    },
    toggleForgeSectionEnabled() {
      this.forgeSectionEnabled = !this.forgeSectionEnabled;
      api.Store.set("app.forgeEnabled", this.forgeSectionEnabled);
    },
    async deleteAllConfigData() {
      await api.Store.clear();
    },
  },
});
