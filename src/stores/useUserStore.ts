import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    theme: "light",
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
      this.setTheme();
    },
    setTheme() {
      window.localStorage.setItem("theme", this.theme);
      if (this.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },
  },
});
