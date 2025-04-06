import type { App as VueApp } from 'vue'
// import { createRouter, createWebHistory } from 'vue-router/auto'
// import { routes } from 'vue-router/auto-routes'
// import { createPinia } from 'pinia'

export function configureApp(app: VueApp<unknown>) {
  // const router = createRouter({
  //   history: createWebHistory(),
  //   routes,
  // })

  // app.use(createPinia())
  // app.use(router)
  return app
}
