/**
 * Dock client script, a.k.a. the in-page channel's **page script**: runs
 * inside the inspected app page (same Vite module graph as the app, so
 * `pinia` / `@pinia/colada` and the devtools sources resolve to the app's own
 * instances). It reuses the app-side cache wiring and exposes each devtools
 * action directly as a typed channel event.
 *
 * It is the authority of the channel: panels handshake with it directly, so no
 * devframe server round-trip (and no auth) is involved, and a panel that
 * connects — or reconnects after a reload — receives the authoritative cache
 * shared state.
 */
import { createPageScriptChannel } from 'devframe/in-page-channel'
import type { QueryCache, MutationCache } from '@pinia/colada'
import { getActivePinia } from 'pinia'
import {
  removeMutationEntry,
  removeQueryEntry,
  replaceMutationEntry,
  replaceQueryEntry,
  restoreClonedDeep,
  serializeDevtoolsValue,
} from '@pinia/colada-devtools/shared'
import type { UseMutationEntryPayload, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from './app-bridge.ts'
import { PINIA_COLADA_CHANNEL, PINIA_COLADA_WAIT_TIMEOUT } from './channel.ts'
import type { PiniaColadaChannelProtocol } from './channel.ts'

const SETUP_KEY = Symbol.for('pinia-colada:devtools:client-script')

declare global {
  interface Window {
    [SETUP_KEY]?: Promise<boolean>
  }
}

// The app might install Pinia and Pinia Colada after this script loads.
async function waitForPiniaColada() {
  const colada = await import('@pinia/colada')
  const start = Date.now()
  while (Date.now() - start < PINIA_COLADA_WAIT_TIMEOUT) {
    const pinia = getActivePinia()
    if (pinia?._s.has(colada.useQueryCache.$id)) return { pinia, colada }
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

async function setupPiniaColadaBridge(): Promise<boolean> {
  const setup = await waitForPiniaColada()
  if (!setup) {
    // Standalone viewer or an app without Pinia Colada: nothing to inspect, so
    // never answer a handshake — panels stay `connecting` and show their empty
    // state
    return false
  }

  const { pinia, colada } = setup
  const { useQueryCache, useMutationCache } = colada
  const queryCache: QueryCache = useQueryCache(pinia)
  const mutationCache: MutationCache = useMutationCache(pinia)

  let mutateCache:
    | ((mutator: (cache: import('./channel.ts').PiniaColadaCacheState) => void) => void)
    | undefined

  const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, (event, payload) => {
    // The initial sync includes any updates missed during setup.
    if (!mutateCache) return
    const serializedPayload = serializeDevtoolsValue(payload)
    mutateCache((cache) => {
      if (event === 'queries:all') cache.queries = serializedPayload as UseQueryEntryPayload[]
      else if (event === 'queries:update') {
        replaceQueryEntry(cache.queries, serializedPayload as UseQueryEntryPayload)
      } else if (event === 'queries:delete') {
        removeQueryEntry(cache.queries, serializedPayload as UseQueryEntryPayload)
      } else if (event === 'mutations:all') {
        cache.mutations = serializedPayload as UseMutationEntryPayload[]
      } else if (event === 'mutations:update') {
        replaceMutationEntry(cache.mutations, serializedPayload as UseMutationEntryPayload)
      } else {
        removeMutationEntry(cache.mutations, serializedPayload as UseMutationEntryPayload)
      }
    })
  })

  const channel = createPageScriptChannel<PiniaColadaChannelProtocol>({
    name: PINIA_COLADA_CHANNEL,
    serialize: serializeDevtoolsValue,
    deserialize: restoreClonedDeep,
    functions: {
      'queries:clear': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:clear'],
      },
      'queries:refetch': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:refetch'],
      },
      'queries:invalidate': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:invalidate'],
      },
      'queries:reset': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:reset'],
      },
      // Edited state can contain rich values restored by the channel codec.
      'queries:set:state': { type: 'action', handler: bridge.actions['queries:set:state'] },
      'queries:simulate:loading': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:simulate:loading'],
      },
      'queries:simulate:loading:stop': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:simulate:loading:stop'],
      },
      'queries:simulate:error': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:simulate:error'],
      },
      'queries:simulate:error:stop': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['queries:simulate:error:stop'],
      },
      'mutations:clear': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:clear'],
      },
      'mutations:remove': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:remove'],
      },
      'mutations:simulate:loading': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:simulate:loading'],
      },
      'mutations:simulate:loading:stop': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:simulate:loading:stop'],
      },
      'mutations:simulate:error': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:simulate:error'],
      },
      'mutations:simulate:error:stop': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:simulate:error:stop'],
      },
      'mutations:replay': {
        type: 'action',
        jsonSerializable: true,
        handler: bridge.actions['mutations:replay'],
      },
    },
  })

  const cacheState = await channel.sharedState.get('cache', {
    initialValue: { queries: [], mutations: [] },
  })
  mutateCache = (mutator) => cacheState.mutate(mutator)

  // Seed the authoritative cache before a panel connects.
  bridge.sendAll()

  return true
}

export default function setupPiniaColadaDevtools() {
  if (SETUP_KEY in window) return window[SETUP_KEY]

  const setup = setupPiniaColadaBridge().then(
    (didSetup) => {
      // A later invocation can try again if Pinia was not installed in time.
      if (!didSetup) delete window[SETUP_KEY]
      return didSetup
    },
    (error) => {
      delete window[SETUP_KEY]
      throw error
    },
  )
  window[SETUP_KEY] = setup
  return setup
}
