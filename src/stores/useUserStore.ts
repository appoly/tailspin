import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    theme: "dark",
  }),
  actions: {
    init() {
      this.initTheme(); // Light or dark mode
    },
    initTheme() {
      this.theme = window.localStorage.getItem("theme") ?? this.theme;
      this.setTheme();
    },
    toggleTheme() {
      this.theme = this.theme === "light" ? "dark" : "light";
      console.log(this.theme);

      this.setTheme();
    },
    setTheme() {
      window.localStorage.setItem("theme", this.theme);
      if (this.theme === "dark") {
        document.documentElement.setAttribute("data-bs-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-bs-theme", "light");
      }
    },
  },
});
