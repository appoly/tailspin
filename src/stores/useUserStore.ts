import { defineStore } from "pinia";
import Store from 'electron-store';

const persistentStore = new Store({ name: 'user' });

export const useUserStore = defineStore("user", {
  state: () => ({
    theme: "dark",
  }),
  actions: {
    init() {
      this.initTheme(); // Light or dark mode
    },
    initTheme() {
      this.theme = persistentStore.get("theme", this.theme) as string;
      this.setTheme();
    },
    toggleTheme() {
      this.theme = this.theme === "light" ? "dark" : "light";
      console.log(this.theme);

      this.setTheme();
    },
    setTheme() {
      persistentStore.set("theme", this.theme);
      if (this.theme === "dark") {
        document.documentElement.setAttribute("data-bs-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-bs-theme", "light");
      }
    },
  },
});
