import { createRouter, createWebHashHistory } from "vue-router";
import LogViewerPage from "@/pages/LogViewerPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { name: "Home", path: "/", redirect: "/log-viewer" },
    { name: "Log Viewer", path: "/log-viewer", component: LogViewerPage },
    { name: "Settings", path: "/settings", component: SettingsPage },
  ],
  scrollBehavior() {
    // always scroll to top
    return { top: 0 };
  },
});

export default router;
