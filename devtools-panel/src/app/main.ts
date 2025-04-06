import { createApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router/auto'
// import { routes } from 'vue-router/auto-routes'
// import { createPinia } from 'pinia'

import App from './app.vue'
import { configureApp } from '../configure-app'

const app = createApp(App)
configureApp(app)
app.mount(`#app`)
