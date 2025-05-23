import { createApp } from 'vue'
import App from './app.vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

const app = createApp(App)
const router = createRouter({
  // in an iframe we still affect the parent history
  history: createMemoryHistory(),
  routes: [{ path: '/', redirect: '/queries' }, ...routes],
})

// preserve the location in local storage
router.afterEach((to) => {
  localStorage.setItem('pc-devtools-route', to.fullPath)
  // TODO: preserve full history (last 100 entries)
})

// app.use(createPinia())
app.use(router)

// navigate to the last location saved in local storage
const lastLocation = localStorage.getItem('pc-devtools-route') || '/queries'
router.push(lastLocation).then(() => {
  app.mount('#app')
})
