import App from './app.vue'
import { createApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router'
// import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

const app = createApp(App)
app.use(createPinia()).use(PiniaColada, {})
app.mount(`#app`)
