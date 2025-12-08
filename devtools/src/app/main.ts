import App from './app.vue'
import { createApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router'
// import { routes } from 'vue-router/auto-routes'
import { createPinia, getActivePinia } from 'pinia'
import { hydrateQueryCache, PiniaColada, useQueryCache } from '@pinia/colada'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import 'water.css'

const app = createApp(App)
app.provide('test', 'IT WORKS!')
app.use(createPinia())
app.use(PiniaColada, {
  queryOptions: {},
})

// simulate SSR
if (typeof document !== 'undefined') {
  const queryCache = useQueryCache(getActivePinia())
  hydrateQueryCache(queryCache, {
    '["ssr"]': [{ text: 'I was serializaed!', when: Date.now() }, null, 0],
  })
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/(home).vue'),
    },
    {
      path: '/multi-types',
      component: () => import('./pages/multi-types.vue'),
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
    {
      path: '/ssr-test',
      component: () => import('./pages/ssr-test.vue'),
    },
  ],
})

app.use(router)
app.mount(`#app`)
