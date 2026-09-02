import { createApp, h, reactive, ref } from 'vue'
import { restoreClonedDeep } from '@pinia/colada-devtools/shared'
import App from './App.vue'
import { configureApp } from './configure-app.ts'
import { PINIA_COLADA_WAIT_TIMEOUT } from '../channel.ts'
import type { PiniaColadaCacheState } from '../channel.ts'
import { panelChannel } from './panel-channel.ts'
import './styles.css'

const cacheState = reactive<PiniaColadaCacheState>({
  queries: [],
  mutations: [],
})
const status = ref<'loading' | 'ready' | 'not-found'>('loading')

const app = createApp(() =>
  h(App, {
    queries: cacheState.queries,
    mutations: cacheState.mutations,
    status: status.value,
  }),
)
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
    cacheState.queries.splice(0, cacheState.queries.length, ...value.queries)
    cacheState.mutations.splice(0, cacheState.mutations.length, ...value.mutations)
  }

  cache.on('updated', applyCache)
  applyCache()
  cacheReady = true
  status.value = 'ready'
})
