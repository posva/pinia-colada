import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router/auto'
import { createPinia } from 'pinia'
import { QueryPlugin } from '@pinia/colada'
import './style.css'
import 'water.css'

import App from './App.vue'

const app = createApp(App)
const router = createRouter({
  history: createWebHistory(),
})

app.use(createPinia())
app.use(QueryPlugin, {})
app.use(router)

app.mount('#app')
