import App from '../panel/DevtoolsPanel.ce.vue'
import { createApp } from 'vue'
import { routes } from 'vue-router/auto-routes'
import { createMemoryHistory, createRouter } from 'vue-router'

window.addEventListener('message', onMessage)

function onMessage(e: MessageEvent) {
  if (!e.ports.length) return

  // Use the transferred port to post a message to the main frame
  e.ports[0]!.postMessage('A message from the iframe in page2.html')

  // @ts-expect-error: not defined in the types
  window.parent?.parent?.__PINIA_COLADA_DEVTOOLS_LOAD?.()

  const app = createApp(App)
  app.provide('port', e.ports[0])

  const router = createRouter({
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
    app.mount(`#app`)
  })
}
