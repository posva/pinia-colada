/**
 * App-side devtools wiring: mirrors the caches into `AppEmits` messages and
 * executes `DevtoolsEmits` actions against them. Extracted from
 * `PiniaColadaDevtools.vue` so other transports (e.g. the devframe-based
 * devtools) can reuse it outside of a component.
 */
import type { QueryCache, MutationCache } from '@pinia/colada'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import {
  addDevtoolsInfo,
  createQueryEntryPayload,
  createMutationEntryPayload,
  ensureQueryDevtoolsInfo,
  ensureMutationDevtoolsInfo,
} from './pc-devtools-info-plugin'

export interface DevtoolsAppBridge {
  /**
   * Sends the full list of queries and mutations to the devtools. Call it
   * when the devtools UI signals it's ready.
   */
  sendAll: () => void
  actions: {
    [K in keyof DevtoolsEmits]: (...args: DevtoolsEmits[K]) => void
  }
}

export type DevtoolsAppEmit = <K extends keyof AppEmits>(event: K, ...args: AppEmits[K]) => void

export function setupDevtoolsAppBridge(
  queryCache: QueryCache,
  mutationCache: MutationCache,
  emit: DevtoolsAppEmit,
): DevtoolsAppBridge {
  addDevtoolsInfo(queryCache, mutationCache)

  queryCache.$onAction(({ name, after, onError, args }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => {
        emit('queries:delete', createQueryEntryPayload(entry))
      })
    } else if (
      name === 'track' ||
      name === 'untrack' ||
      name === 'cancel' ||
      name === 'invalidate' ||
      name === 'fetch' ||
      name === 'setEntryState'
    ) {
      const [entry] = args

      // on fetch we want to see it loading
      if (name === 'fetch') {
        const payload = createQueryEntryPayload(entry)
        // NOTE: pinia colada does not expose an action for this
        payload.asyncStatus = 'loading'
        emit('queries:update', payload)
      }

      // TODO: throttle
      after(() => {
        ensureQueryDevtoolsInfo(entry).simulate = null
        emit('queries:update', createQueryEntryPayload(entry))

        // emit an update when the data becomes stale
        if (
          name === 'fetch' &&
          entry.options?.staleTime != null &&
          Number.isFinite(entry.options.staleTime)
        ) {
          setTimeout(() => {
            emit('queries:update', createQueryEntryPayload(entry))
          }, entry.options.staleTime)
        }
      })
      onError(() => {
        emit('queries:update', createQueryEntryPayload(entry))
      })
    } else if (name === 'create') {
      after((entry) => {
        emit('queries:update', createQueryEntryPayload(entry))
      })
    } else if (name === 'setQueryData') {
      // we need to track changes to invalidatedAt
      const [key] = args
      after(() => {
        const entry = queryCache.getEntries({ key, exact: true })[0]
        if (entry) {
          emit('queries:update', createQueryEntryPayload(entry))
        }
      })
    }
  })

  mutationCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => {
        emit('mutations:delete', createMutationEntryPayload(entry))
      })
    } else if (name === 'mutate' || name === 'setEntryState' || name === 'untrack') {
      const [entry] = args
      // avoid displaying temporary entries
      if (entry.id < 1) {
        return
      }
      if (name === 'mutate') {
        const payload = createMutationEntryPayload(entry)
        // NOTE: pinia colada does not expose an action for this
        payload.asyncStatus = 'loading'
        emit('mutations:update', payload)
      }
      after(() => {
        emit('mutations:update', createMutationEntryPayload(entry))
      })
      onError(() => {
        emit('mutations:update', createMutationEntryPayload(entry))
      })
    } else if (name === 'create') {
      after((entry) => {
        // avoid displaying temporary entries
        if (entry.id > 0) {
          emit('mutations:update', createMutationEntryPayload(entry))
        }
      })
    }
  })

  const actions: DevtoolsAppBridge['actions'] = {
    'queries:clear': (filters = {}) => {
      const entries = queryCache.getEntries(filters)
      entries.forEach((entry) => queryCache.remove(entry))
    },

    'queries:refetch': (key) => {
      queryCache.invalidateQueries({ key, exact: true }, 'all')
    },

    'queries:invalidate': (key) => {
      queryCache.invalidateQueries({ key, exact: true })
    },

    'queries:reset': (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          status: 'pending',
          data: undefined,
          error: null,
        })
      }
    },

    'queries:set:state': (key, state) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.setEntryState(entry, state)
        emit('queries:update', createQueryEntryPayload(entry))
      }
    },

    'queries:simulate:loading': (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        entry.asyncStatus.value = 'loading'
        ensureQueryDevtoolsInfo(entry).simulate = 'loading'
        emit('queries:update', createQueryEntryPayload(entry))
      }
    },
    'queries:simulate:loading:stop': (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'loading') {
        entry.asyncStatus.value = 'idle'
        ensureQueryDevtoolsInfo(entry).simulate = null
        emit('queries:update', createQueryEntryPayload(entry))
      }
    },

    'queries:simulate:error': (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          ...entry.state.value,
          status: 'error',
          error: new Error('Simulated error'),
        })
        // we set after because setting the entry state resets the simulation
        ensureQueryDevtoolsInfo(entry).simulate = 'error'
        emit('queries:update', createQueryEntryPayload(entry))
      }
    },

    'queries:simulate:error:stop': (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'error') {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          ...entry.state.value,
          status: entry.state.value.data !== undefined ? 'success' : 'pending',
          error: null,
        })
        ensureQueryDevtoolsInfo(entry).simulate = null
        emit('queries:update', createQueryEntryPayload(entry))
      }
    },

    'mutations:clear': (filters = {}) => {
      const entries = mutationCache.getEntries(filters)
      entries.forEach((entry) => mutationCache.remove(entry))
    },

    'mutations:remove': (id) => {
      const entry = mutationCache.get(id)
      if (entry) {
        mutationCache.remove(entry)
      }
    },

    'mutations:simulate:loading': (id) => {
      const entry = mutationCache.get(id)
      if (entry) {
        entry.asyncStatus.value = 'loading'
        ensureMutationDevtoolsInfo(entry).simulate = 'loading'
        emit('mutations:update', createMutationEntryPayload(entry))
      }
    },

    'mutations:simulate:loading:stop': (id) => {
      const entry = mutationCache.get(id)
      if (entry && ensureMutationDevtoolsInfo(entry).simulate === 'loading') {
        entry.asyncStatus.value = 'idle'
        ensureMutationDevtoolsInfo(entry).simulate = null
        emit('mutations:update', createMutationEntryPayload(entry))
      }
    },

    'mutations:simulate:error': (id) => {
      const entry = mutationCache.get(id)
      if (entry) {
        mutationCache.setEntryState(entry, {
          ...entry.state.value,
          status: 'error',
          error: new Error('Simulated error'),
        })
        // we set after because setting the entry state resets the simulation
        ensureMutationDevtoolsInfo(entry).simulate = 'error'
        emit('mutations:update', createMutationEntryPayload(entry))
      }
    },

    'mutations:simulate:error:stop': (id) => {
      const entry = mutationCache.get(id)
      if (entry && ensureMutationDevtoolsInfo(entry).simulate === 'error') {
        const state = entry.state.value
        mutationCache.setEntryState(
          entry,
          state.data === undefined
            ? {
                data: undefined,
                status: 'pending',
                error: null,
              }
            : { data: state.data, status: 'success', error: null },
        )
        ensureMutationDevtoolsInfo(entry).simulate = null
        emit('mutations:update', createMutationEntryPayload(entry))
      }
    },

    'mutations:replay': (id) => {
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
        // Errors are automatically emitted via mutations:update
      })
    },
  }

  return {
    actions,
    sendAll: () => {
      emit('queries:all', queryCache.getEntries().map(createQueryEntryPayload))
      emit('mutations:all', mutationCache.getEntries().map(createMutationEntryPayload))
    },
  }
}
