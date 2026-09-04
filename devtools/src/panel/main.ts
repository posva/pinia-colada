import { createApp, h, ref } from 'vue'
import { restoreClonedDeep } from '@pinia/colada-devtools/shared'
import App from './App.vue'
import { configureApp } from './configure-app.ts'
import { PINIA_COLADA_WAIT_TIMEOUT } from '../channel.ts'
import type { PiniaColadaCacheState } from '../channel.ts'
import { MUTATIONS_KEY, QUERIES_KEY } from './composables/devtools-context.ts'
import { panelChannel } from './panel-channel.ts'
import './styles.css'

const queries = ref<PiniaColadaCacheState['queries']>([])
const mutations = ref<PiniaColadaCacheState['mutations']>([])
const status = ref<'loading' | 'ready' | 'not-found'>('loading')

const app = createApp(() =>
  h(App, {
    status: status.value,
  }),
)
app.provide(QUERIES_KEY, queries)
app.provide(MUTATIONS_KEY, mutations)
configureApp(app)
app.mount('#app')

let connectionAttempt = 0
let cacheReady = false

async function waitForConnection() {
  const attempt = ++connectionAttempt
  status.value = 'loading'
  try {
    // Leave one polling interval for the page script to create its channel.
    await panelChannel.whenConnected(PINIA_COLADA_WAIT_TIMEOUT + 200)
  } catch {
    if (attempt === connectionAttempt) status.value = 'not-found'
  }
}

panelChannel.events.on('status:updated', (channelStatus) => {
  if (channelStatus === 'connected') {
    connectionAttempt++
    if (cacheReady) status.value = 'ready'
  } else if (channelStatus === 'connecting') {
    void waitForConnection()
  }
})

void waitForConnection()
void panelChannel.sharedState.get('cache').then((cache) => {
  function applyCache() {
    const value = restoreClonedDeep(cache.value()) as unknown as PiniaColadaCacheState
    queries.value = value.queries
    mutations.value = value.mutations
  }

  cache.on('updated', applyCache)
  applyCache()
  cacheReady = true
  status.value = 'ready'
})
