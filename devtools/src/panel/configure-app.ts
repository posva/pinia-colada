import type { App as VueApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
// import { createPinia } from 'pinia'

export function configureApp(app: VueApp<unknown>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  // app.use(createPinia())
  app.use(router)

  return app
}
