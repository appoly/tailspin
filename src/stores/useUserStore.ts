import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    theme: "dark",
    defaultSshPath: "",
  }),
  actions: {
    init() {
      this.initTheme(); // Light or dark mode
      this.initDefaultSshPath();
    },
    async initTheme() {
      this.theme = window.localStorage.getItem("theme") || this.theme;
      this.setTheme();
    },
    changeTheme(value: string) {
      this.theme = value;
      this.setTheme();
    },
    async setTheme() {
      window.localStorage.setItem("theme", this.theme);
      if (this.theme === "auto") {
        const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.setAttribute("data-bs-theme", theme);

        // watch for changes
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
          const newColorScheme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-bs-theme", newColorScheme);
        });
      } else if (this.theme === "dark") {
        document.documentElement.setAttribute("data-bs-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-bs-theme", "light");
      }
    },
    async initDefaultSshPath() {
      this.defaultSshPath = await api.Store.get("app.sshKeyPath", "");
    },
  },
});
