/**
 * Dock client script, a.k.a. the in-page channel's **page script**: runs
 * inside the inspected app page (same Vite module graph as the app, so
 * `pinia` / `@pinia/colada` and the devtools sources resolve to the app's own
 * instances). It wires the app-side caches directly to the authoritative
 * shared state and exposes each devtools action through the channel.
 *
 * It is the authority of the channel: panels handshake with it directly, so no
 * devframe server round-trip (and no auth) is involved, and a panel that
 * connects — or reconnects after a reload — receives the authoritative cache
 * shared state.
 */
import { createPageScriptChannel } from 'devframe/in-page-channel'
import type { QueryCache, MutationCache } from '@pinia/colada'
import { getActivePinia } from 'pinia'
import { watch } from 'vue'
import {
  removeMutationEntry,
  removeQueryEntry,
  onPromiseSettled,
  replaceMutationEntry,
  replaceQueryEntry,
  restoreClonedDeep,
  restoreOriginalValues,
  serializeDevtoolsValue,
} from '@pinia/colada-devtools/shared'
import type { UseMutationEntryPayload, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'
import {
  addDevtoolsInfo,
  createMutationEntryPayload,
  createQueryEntryPayload,
  ensureMutationDevtoolsInfo,
  ensureQueryDevtoolsInfo,
} from './pc-devtools-info-plugin'
import { PINIA_COLADA_CHANNEL, PINIA_COLADA_WAIT_TIMEOUT } from './channel.ts'
import type { PiniaColadaCacheState, PiniaColadaChannelProtocol } from './channel.ts'
import { entryFiltersSchema, entryKeyListSchema, entryKeySchema } from './mcp-shared.ts'
import type { DevtoolsMcpEntryKey } from './mcp-shared.ts'
import { z } from 'zod'

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

  let mutateCache: ((mutator: (cache: PiniaColadaCacheState) => void) => void) | undefined

  function updateQuery(entry: UseQueryEntryPayload) {
    mutateCache?.((cache) => replaceQueryEntry(cache.queries, serializeDevtoolsValue(entry)))
  }

  function deleteQuery(entry: UseQueryEntryPayload) {
    mutateCache?.((cache) => removeQueryEntry(cache.queries, serializeDevtoolsValue(entry)))
  }

  function updateMutation(entry: UseMutationEntryPayload) {
    mutateCache?.((cache) => replaceMutationEntry(cache.mutations, serializeDevtoolsValue(entry)))
  }

  function deleteMutation(entry: UseMutationEntryPayload) {
    mutateCache?.((cache) => removeMutationEntry(cache.mutations, serializeDevtoolsValue(entry)))
  }

  addDevtoolsInfo(queryCache, mutationCache)

  // Sync queries started before setup once they settle because their fetch
  // lifecycle was not observed by $onAction.
  for (const entry of queryCache.getEntries()) {
    const refreshCall = entry.pending?.refreshCall
    if (refreshCall) {
      const syncSettledEntry = () => updateQuery(createQueryEntryPayload(entry))
      void refreshCall.then(syncSettledEntry, syncSettledEntry)
    }
  }

  // Do the same for mutations, which do not expose their pending promise.
  for (const entry of mutationCache.getEntries()) {
    if (entry.asyncStatus.value === 'loading') {
      const stop = watch(entry.asyncStatus, (asyncStatus) => {
        if (asyncStatus === 'idle') {
          stop()
          updateMutation(createMutationEntryPayload(entry))
        }
      })
    }
  }

  queryCache.$onAction(({ name, after, onError, args }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => deleteQuery(createQueryEntryPayload(entry)))
    } else if (
      name === 'track' ||
      name === 'untrack' ||
      name === 'cancel' ||
      name === 'invalidate' ||
      name === 'fetch' ||
      name === 'setEntryState'
    ) {
      const [entry] = args

      // On fetch, display the loading state immediately.
      if (name === 'fetch') {
        const payload = createQueryEntryPayload(entry)
        payload.asyncStatus = 'loading'
        updateQuery(payload)
      }

      // TODO: throttle
      after(() => {
        ensureQueryDevtoolsInfo(entry).simulate = null
        updateQuery(createQueryEntryPayload(entry))

        if (
          name === 'fetch' &&
          entry.options?.staleTime != null &&
          Number.isFinite(entry.options.staleTime)
        ) {
          setTimeout(() => updateQuery(createQueryEntryPayload(entry)), entry.options.staleTime)
        }
      })
      onError(() => updateQuery(createQueryEntryPayload(entry)))
    } else if (name === 'create') {
      after((entry) => updateQuery(createQueryEntryPayload(entry)))
    } else if (name === 'setQueryData') {
      const [key] = args
      after(() => {
        const entry = queryCache.get(key)
        if (entry) updateQuery(createQueryEntryPayload(entry))
      })
    }
  })

  mutationCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => deleteMutation(createMutationEntryPayload(entry)))
    } else if (name === 'mutate' || name === 'setEntryState' || name === 'untrack') {
      const [entry] = args
      // Avoid displaying temporary entries.
      if (entry.id < 1) return

      if (name === 'mutate') {
        const payload = createMutationEntryPayload(entry)
        payload.asyncStatus = 'loading'
        updateMutation(payload)
      }
      after(() => updateMutation(createMutationEntryPayload(entry)))
      onError(() => updateMutation(createMutationEntryPayload(entry)))
    } else if (name === 'create') {
      after((entry) => {
        if (entry.id > 0) updateMutation(createMutationEntryPayload(entry))
      })
    }
  })

  const channel = createPageScriptChannel<PiniaColadaChannelProtocol>({
    name: PINIA_COLADA_CHANNEL,
    serialize: serializeDevtoolsValue,
    deserialize: restoreClonedDeep,
    functions: {
      // NOTE: this version is ready for MCP, still not released
      'queries:refetch': {
        type: 'action',
        jsonSerializable: true,
        args: [entryFiltersSchema],
        returns: entryKeyListSchema,
        // @ts-expect-error: TODO: will be supported in next version
        agent: {
          description:
            'Refetch Pinia Colada queries matching the key, exact, stale, active, and status filters.',
          safety: 'action',
        },
        handler: async (filters = {}) => {
          const entries = queryCache.getEntries(filters)
          await Promise.allSettled(entries.map((entry) => queryCache.fetch(entry)))
          return entries.map((entry) => Array.from(entry.key) as DevtoolsMcpEntryKey)
        },
      },

      'queries:clear': {
        type: 'action',
        handler: (filters = {}) => {
          queryCache.getEntries(filters).forEach((entry) => queryCache.remove(entry))
        },
      },

      'queries:invalidate': {
        type: 'action',
        handler: (key) => {
          queryCache.invalidateQueries({ key, exact: true })
        },
      },

      'queries:reset': {
        type: 'action',
        handler: (key) => {
          const entry = queryCache.get(key)
          if (entry) {
            queryCache.cancel(entry)
            queryCache.setEntryState(entry, {
              status: 'pending',
              data: undefined,
              error: null,
            })
          }
        },
      },

      // TODO: rename to state:set and create state:get
      // Edited state can contain rich values restored by the channel codec.
      'queries:set:state': {
        type: 'action',
        handler: (key, state) => {
          const entry = queryCache.get(key)
          if (entry) {
            queryCache.setEntryState(entry, restoreOriginalValues(state, entry.state.value))
            updateQuery(createQueryEntryPayload(entry))
          }
        },
      },

      'queries:simulate:loading': {
        type: 'action',
        handler: (key) => {
          const entry = queryCache.get(key)
          if (entry) {
            entry.asyncStatus.value = 'loading'
            ensureQueryDevtoolsInfo(entry).simulate = 'loading'
            updateQuery(createQueryEntryPayload(entry))
          }
        },
      },

      'queries:simulate:loading:stop': {
        type: 'action',
        handler: (key) => {
          const entry = queryCache.get(key)
          if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'loading') {
            entry.asyncStatus.value = 'idle'
            ensureQueryDevtoolsInfo(entry).simulate = null
            updateQuery(createQueryEntryPayload(entry))
          }
        },
      },

      'queries:simulate:error': {
        type: 'action',
        handler: (key) => {
          const entry = queryCache.get(key)
          if (entry) {
            queryCache.cancel(entry)
            queryCache.setEntryState(entry, {
              ...entry.state.value,
              status: 'error',
              error: new Error('Simulated error'),
            })
            // Set after setEntryState because that action resets the simulation.
            ensureQueryDevtoolsInfo(entry).simulate = 'error'
            updateQuery(createQueryEntryPayload(entry))
          }
        },
      },

      'queries:simulate:error:stop': {
        type: 'action',
        handler: (key) => {
          const entry = queryCache.get(key)
          if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'error') {
            queryCache.cancel(entry)
            queryCache.setEntryState(entry, {
              ...entry.state.value,
              status: entry.state.value.data !== undefined ? 'success' : 'pending',
              error: null,
            })
            ensureQueryDevtoolsInfo(entry).simulate = null
            updateQuery(createQueryEntryPayload(entry))
          }
        },
      },

      'mutations:clear': {
        type: 'action',
        handler: (filters = {}) => {
          mutationCache.getEntries(filters).forEach((entry) => mutationCache.remove(entry))
        },
      },

      'mutations:remove': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)
          if (entry) mutationCache.remove(entry)
        },
      },

      'mutations:simulate:loading': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)
          if (entry) {
            entry.asyncStatus.value = 'loading'
            ensureMutationDevtoolsInfo(entry).simulate = 'loading'
            updateMutation(createMutationEntryPayload(entry))
          }
        },
      },

      'mutations:simulate:loading:stop': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)
          if (entry && ensureMutationDevtoolsInfo(entry).simulate === 'loading') {
            entry.asyncStatus.value = 'idle'
            ensureMutationDevtoolsInfo(entry).simulate = null
            updateMutation(createMutationEntryPayload(entry))
          }
        },
      },

      'mutations:simulate:error': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)
          if (entry) {
            mutationCache.setEntryState(entry, {
              ...entry.state.value,
              status: 'error',
              error: new Error('Simulated error'),
            })
            // Set after setEntryState because that action resets the simulation.
            ensureMutationDevtoolsInfo(entry).simulate = 'error'
            updateMutation(createMutationEntryPayload(entry))
          }
        },
      },

      'mutations:simulate:error:stop': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)
          if (entry && ensureMutationDevtoolsInfo(entry).simulate === 'error') {
            const state = entry.state.value
            mutationCache.setEntryState(
              entry,
              state.data === undefined
                ? { data: undefined, status: 'pending', error: null }
                : { data: state.data, status: 'success', error: null },
            )
            ensureMutationDevtoolsInfo(entry).simulate = null
            updateMutation(createMutationEntryPayload(entry))
          }
        },
      },

      'mutations:replay': {
        type: 'action',
        handler: (id) => {
          const entry = mutationCache.get(id)

          if (!entry) {
            console.warn('[@pinia/colada] Cannot replay: mutation entry not found')
            return
          }

          if (entry.gcTimeout) {
            console.warn(
              "[@pinia/colada] Cannot replay: mutation is in the process of being garbage collected. It isn't used anywhere and replaying it will have no effect.",
            )
            return
          }

          mutationCache.setEntryState(entry, {
            data: undefined,
            status: 'pending',
            error: null,
          })
          mutationCache.mutate(entry).catch(() => {
            // Errors update the authoritative state through $onAction.
          })
        },
      },
    },
  })

  const cacheState = await channel.sharedState.get('cache', {
    initialValue: { queries: [], mutations: [] },
  })
  mutateCache = (mutator) => cacheState.mutate(mutator)

  let promiseRefreshScheduled = false
  onPromiseSettled(() => {
    if (promiseRefreshScheduled) return
    promiseRefreshScheduled = true
    queueMicrotask(() => {
      promiseRefreshScheduled = false
      mutateCache?.((cache) => {
        cache.queries = serializeDevtoolsValue(queryCache.getEntries().map(createQueryEntryPayload))
        cache.mutations = serializeDevtoolsValue(
          mutationCache.getEntries().map(createMutationEntryPayload),
        )
      })
    })
  })

  // Seed the authoritative cache before a panel connects.
  mutateCache((cache) => {
    cache.queries = serializeDevtoolsValue(queryCache.getEntries().map(createQueryEntryPayload))
    cache.mutations = serializeDevtoolsValue(
      mutationCache.getEntries().map(createMutationEntryPayload),
    )
  })

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
