import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/index.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// Tell the preload script the app has rendered so it can remove the boot
// loader — without this it stays up until its 5s fallback timeout.
window.postMessage({ payload: 'removeLoading' }, '*')
