import { connectPanelChannel } from 'devframe/in-page-channel'
import { createApp, reactive } from 'vue'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import type { DevtoolsActions } from '../../../src/panel/composables/devtools-context.ts'
import { configureApp } from '../../../src/panel/configure-app.ts'
import DevtoolsPanel from '../../../src/panel/DevtoolsPanel.vue'
import { PINIA_COLADA_CHANNEL } from '../../src/channel.ts'
import type { PiniaColadaCacheState, PiniaColadaChannelProtocol } from '../../src/channel.ts'
import './panel-styles.css'

const channel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  serialize: serializeDevtoolsValue,
  deserialize: restoreClonedDeep,
  functions: {},
})

const actions = {
  'queries:clear': (...args) => channel.callEvent('queries:clear', ...args),
  'queries:refetch': (key) => channel.callEvent('queries:refetch', key),
  'queries:invalidate': (key) => channel.callEvent('queries:invalidate', key),
  'queries:reset': (key) => channel.callEvent('queries:reset', key),
  'queries:set:state': (key, state) => channel.callEvent('queries:set:state', key, state),
  'queries:simulate:loading': (key) => channel.callEvent('queries:simulate:loading', key),
  'queries:simulate:loading:stop': (key) => channel.callEvent('queries:simulate:loading:stop', key),
  'queries:simulate:error': (key) => channel.callEvent('queries:simulate:error', key),
  'queries:simulate:error:stop': (key) => channel.callEvent('queries:simulate:error:stop', key),
  'mutations:clear': (...args) => channel.callEvent('mutations:clear', ...args),
  'mutations:remove': (id) => channel.callEvent('mutations:remove', id),
  'mutations:simulate:loading': (id) => channel.callEvent('mutations:simulate:loading', id),
  'mutations:simulate:loading:stop': (id) =>
    channel.callEvent('mutations:simulate:loading:stop', id),
  'mutations:simulate:error': (id) => channel.callEvent('mutations:simulate:error', id),
  'mutations:simulate:error:stop': (id) => channel.callEvent('mutations:simulate:error:stop', id),
  'mutations:replay': (id) => channel.callEvent('mutations:replay', id),
} satisfies DevtoolsActions

const cache = await channel.sharedState.get('cache')
const initialCache = cache.value() as unknown as PiniaColadaCacheState
const cacheState = reactive<PiniaColadaCacheState>({
  queries: [...initialCache.queries],
  mutations: [...initialCache.mutations],
})

function applyCache() {
  const value = cache.value() as unknown as PiniaColadaCacheState
  cacheState.queries.splice(0, cacheState.queries.length, ...value.queries)
  cacheState.mutations.splice(0, cacheState.mutations.length, ...value.mutations)
}

cache.on('updated', applyCache)

const app = createApp(DevtoolsPanel, {
  actions,
  queries: cacheState.queries,
  mutations: cacheState.mutations,
})
configureApp(app)
app.mount('#app')
applyCache()
