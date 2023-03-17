import { createApp } from 'vue'
import './app.scss';
import "bootstrap-icons/font/bootstrap-icons.css";

import App from './App.vue'
import './samples/node-api'

createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
