import { createApp } from "vue";
import "./app.scss";
import "bootstrap-icons/font/bootstrap-icons.css";

import App from "./App.vue";
import "./samples/node-api";
import { createPinia } from "pinia";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app").$nextTick(() => {
  postMessage({ payload: "removeLoading" }, "*");
});
