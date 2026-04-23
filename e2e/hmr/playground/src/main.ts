import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import App from './App.vue'

declare global {
  var __hmrToken: number
  var __fetchCount: number
  var __itemsMounted: number
}

// stable token so tests can assert HMR didn't trigger a full reload
window.__hmrToken ??= Math.random()
window.__fetchCount = 0
window.__itemsMounted = 0

createApp(App)
  .use(createPinia())
  .use(PiniaColada, {
    queryOptions: {},
  })
  .mount('#app')
