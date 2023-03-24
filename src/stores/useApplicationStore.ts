import { defineStore } from "pinia";

export const useApplicationStore = defineStore("application", {
  state: () => ({
    openConnections: [] as string[],
    page: "connections",
  }),
  actions: {
    changePage(page: string) {
      this.page = page;
    },
    addOpenConnection(connectionId: string) {
      this.openConnections.push(connectionId);
    },
    closeConnection(connectionId: string) {
      this.openConnections = this.openConnections.filter((c) => c !== connectionId);
    },
    goToConnection(connectionId: string) {
      this.page = "connections.page." + connectionId;
      this.setOpen(connectionId);
    },
    setOpen(connectionId: string) {
      this.openConnections.push(connectionId);
    },
  },
});
