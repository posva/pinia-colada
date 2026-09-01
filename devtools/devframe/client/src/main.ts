import { connectPanelChannel } from 'devframe/in-page-channel'
import { createApp } from 'vue'
import type { AppEmits } from '@pinia/colada-devtools/shared'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import { configureApp, DevtoolsPanel } from '@pinia/colada-devtools/panel'
import type { DevtoolsChannel } from '../../../src/panel/composables/duplex-channel.ts'
import { PINIA_COLADA_CHANNEL } from '../../src/channel.ts'
import type { PiniaColadaChannelProtocol } from '../../src/channel.ts'

const channel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  serialize: serializeDevtoolsValue,
  deserialize: restoreClonedDeep,
  functions: {},
})

const callEvent = channel.callEvent as unknown as DevtoolsChannel['emit']
const listeners = new Map<keyof AppEmits, Set<(...args: any[]) => void>>()
const panelChannel: DevtoolsChannel = {
  emit(event, ...args) {
    callEvent(event, ...args)
  },
  on(event, callback) {
    let eventListeners = listeners.get(event)
    if (!eventListeners) listeners.set(event, (eventListeners = new Set()))
    eventListeners.add(callback)
    return () => eventListeners.delete(callback)
  },
}

const cache = await channel.sharedState.get('cache')

function publish<K extends keyof AppEmits>(event: K, ...args: AppEmits[K]) {
  for (const listener of listeners.get(event) ?? []) listener(...args)
}

function applyCache() {
  const value = cache.value()
  publish('queries:all', value.queries as unknown as AppEmits['queries:all'][0])
  publish('mutations:all', value.mutations as unknown as AppEmits['mutations:all'][0])
}

cache.on('updated', applyCache)

const app = createApp(DevtoolsPanel, { channel: panelChannel })
configureApp(app)
app.mount('#app')
applyCache()
