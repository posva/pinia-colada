import type { App as VueApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import ui from '@nuxt/ui/vue-plugin'
// import './styles.css'
// import { createPinia } from 'pinia'

export function configureApp(app: VueApp<unknown>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  // app.use(createPinia())
  app.use(router)
  app.use(ui)

  return app
}
