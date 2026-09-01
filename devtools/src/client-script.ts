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
import type { Pinia } from 'pinia'
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
import { PINIA_COLADA_CHANNEL } from './channel.ts'
import type { PiniaColadaChannelProtocol } from './channel.ts'

const PINIA_WAIT_TIMEOUT = 15_000

// the app might create its pinia after this script loads
async function waitForActivePinia(): Promise<Pinia | null> {
  const start = Date.now()
  while (Date.now() - start < PINIA_WAIT_TIMEOUT) {
    const pinia = getActivePinia()
    if (pinia) return pinia
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

export default async function setupPiniaColadaBridge() {
  const pinia = await waitForActivePinia()
  if (!pinia) {
    // standalone viewer or an app without pinia: nothing to inspect here, so
    // never answer a handshake — panels stay `connecting` and show their empty
    // state
    return
  }

  const { useQueryCache, useMutationCache } = await import('@pinia/colada')
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
        type: 'event',
        handler: (filters) =>
          filters ? bridge.actions['queries:clear'](filters) : bridge.actions['queries:clear'](),
      },
      'queries:refetch': { type: 'event', handler: bridge.actions['queries:refetch'] },
      'queries:invalidate': { type: 'event', handler: bridge.actions['queries:invalidate'] },
      'queries:reset': { type: 'event', handler: bridge.actions['queries:reset'] },
      'queries:set:state': { type: 'event', handler: bridge.actions['queries:set:state'] },
      'queries:simulate:loading': {
        type: 'event',
        handler: bridge.actions['queries:simulate:loading'],
      },
      'queries:simulate:loading:stop': {
        type: 'event',
        handler: bridge.actions['queries:simulate:loading:stop'],
      },
      'queries:simulate:error': {
        type: 'event',
        handler: bridge.actions['queries:simulate:error'],
      },
      'queries:simulate:error:stop': {
        type: 'event',
        handler: bridge.actions['queries:simulate:error:stop'],
      },
      'mutations:clear': {
        type: 'event',
        handler: (filters) =>
          filters
            ? bridge.actions['mutations:clear'](filters)
            : bridge.actions['mutations:clear'](),
      },
      'mutations:remove': { type: 'event', handler: bridge.actions['mutations:remove'] },
      'mutations:simulate:loading': {
        type: 'event',
        handler: bridge.actions['mutations:simulate:loading'],
      },
      'mutations:simulate:loading:stop': {
        type: 'event',
        handler: bridge.actions['mutations:simulate:loading:stop'],
      },
      'mutations:simulate:error': {
        type: 'event',
        handler: bridge.actions['mutations:simulate:error'],
      },
      'mutations:simulate:error:stop': {
        type: 'event',
        handler: bridge.actions['mutations:simulate:error:stop'],
      },
      'mutations:replay': { type: 'event', handler: bridge.actions['mutations:replay'] },
    },
  })

  const cacheState = await channel.sharedState.get('cache', {
    initialValue: { queries: [], mutations: [] },
  })
  mutateCache = (mutator) => cacheState.mutate(mutator)

  // Seed the authoritative cache before a panel connects.
  bridge.sendAll()
}
