import type { App as VueApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
// import { createPinia } from 'pinia'

export function configureApp(app: VueApp<unknown>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/queries' },
      ...routes,
    ],
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

  router.push(lastLocation)

  return app
}
