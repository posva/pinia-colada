import { createApp, reactive } from 'vue'
import { restoreClonedDeep } from '@pinia/colada-devtools/shared'
import { configureApp } from '../panel/configure-app.ts'
import DevtoolsPanel from '../panel/DevtoolsPanel.vue'
import type { PiniaColadaCacheState } from '../channel.ts'
import { panelChannel } from './panel-channel.ts'
import './panel-styles.css'

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

const app = createApp(DevtoolsPanel, {
  queries: cacheState.queries,
  mutations: cacheState.mutations,
})
configureApp(app)
app.mount('#app')
applyCache()
