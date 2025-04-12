import App from './app.vue'
import { createApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router'
// import { routes } from 'vue-router/auto-routes'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import 'water.css'

const app = createApp(App)
app.use(createPinia())
app.use(PiniaColada, {})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/index.vue'),
    },
    {
      path: '/contacts',
      component: () => import('./pages/contacts.vue'),
      children: [
        {
          path: ':id',
          component: () => import('./pages/contacts/[id].vue'),
        },
      ],
    },
  ],
})

app.use(router)
app.mount(`#app`)
