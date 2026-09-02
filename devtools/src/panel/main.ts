import { createApp, reactive } from 'vue'
import { restoreClonedDeep } from '@pinia/colada-devtools/shared'
import App from './App.vue'
import { configureApp } from './configure-app.ts'
import type { PiniaColadaCacheState } from '../channel.ts'
import { panelChannel } from './panel-channel.ts'
import './styles.css'

const cache = await panelChannel.sharedState.get('cache')

function readCache(): PiniaColadaCacheState {
  return restoreClonedDeep(cache.value()) as unknown as PiniaColadaCacheState
}

const initialCache = readCache()
const cacheState = reactive<PiniaColadaCacheState>({
  queries: [...initialCache.queries],
  mutations: [...initialCache.mutations],
})

function applyCache() {
  const value = readCache()
  cacheState.queries.splice(0, cacheState.queries.length, ...value.queries)
  cacheState.mutations.splice(0, cacheState.mutations.length, ...value.mutations)
}

cache.on('updated', applyCache)

const app = createApp(App, {
  queries: cacheState.queries,
  mutations: cacheState.mutations,
})
configureApp(app)
app.mount('#app')
applyCache()
