import { createApp } from "vue";
import "./app.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import App from "./App.vue";
import "./samples/node-api";
import { createPinia } from "pinia";

const app = createApp(App);

app.use(createPinia());

app.mount("#app").$nextTick(() => {
  postMessage({ payload: "removeLoading" }, "*");
});