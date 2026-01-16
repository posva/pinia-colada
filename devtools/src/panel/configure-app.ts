import type { App as VueApp } from 'vue'
import { createMemoryHistory, RouterLink, RouterView } from 'vue-router'
import { experimental_createRouter as createRouter } from 'vue-router/experimental'
import { resolver } from 'vue-router/auto-resolver'
// import { createPinia } from 'pinia'

export function configureApp(app: VueApp<unknown>) {
  const router = createRouter({
    history: createMemoryHistory(),
    resolver,
  })

  // redirect '/' to '/queries'
  router.beforeEach((to) => {
    if (to.path === '/') {
      return '/queries'
    }
  })

  // preserve the location in local storage
  router.afterEach((to) => {
    localStorage.setItem('pc-devtools-route', to.fullPath)
    // TODO: preserve full history (last 100 entries)
  })

  // app.use(createPinia())
  app.use(router)
  app.component('RouterView', RouterView)
  app.component('RouterLink', RouterLink)

  // navigate to the last location saved in local storage
  const lastLocation = localStorage.getItem('pc-devtools-route') || '/queries'

  router.push(lastLocation)

  return app
}
