import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/index.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

// App.vue posts 'removeLoading' once the stores have loaded; the preload
// script drops the loader then, or after its own 5s fallback.
