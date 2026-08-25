/**
 * App-side devtools wiring: mirrors the caches into `AppEmits` messages and
 * executes `DevtoolsEmits` actions against them. Extracted from
 * `PiniaColadaDevtools.vue` so other transports (e.g. the devframe-based
 * devtools) can reuse it outside of a component.
 */
import type { QueryCache, MutationCache } from '@pinia/colada'
import type { DuplexChannel, AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
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
}

export function setupDevtoolsAppBridge(
  queryCache: QueryCache,
  mutationCache: MutationCache,
  transmitter: DuplexChannel<AppEmits, DevtoolsEmits>,
): DevtoolsAppBridge {
  addDevtoolsInfo(queryCache, mutationCache)

  queryCache.$onAction(({ name, after, onError, args }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => {
        transmitter.emit('queries:delete', createQueryEntryPayload(entry))
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
        transmitter.emit('queries:update', payload)
      }

      // TODO: throttle
      after(() => {
        ensureQueryDevtoolsInfo(entry).simulate = null
        transmitter.emit('queries:update', createQueryEntryPayload(entry))

        // emit an update when the data becomes stale
        if (
          name === 'fetch' &&
          entry.options?.staleTime != null &&
          Number.isFinite(entry.options.staleTime)
        ) {
          setTimeout(() => {
            transmitter.emit('queries:update', createQueryEntryPayload(entry))
          }, entry.options.staleTime)
        }
      })
      onError(() => {
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      })
    } else if (name === 'create') {
      after((entry) => {
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      })
    } else if (name === 'setQueryData') {
      // we need to track changes to invalidatedAt
      const [key] = args
      after(() => {
        const entry = queryCache.getEntries({ key, exact: true })[0]
        if (entry) {
          transmitter.emit('queries:update', createQueryEntryPayload(entry))
        }
      })
    }
  })

  mutationCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => {
        transmitter.emit('mutations:delete', createMutationEntryPayload(entry))
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
        transmitter.emit('mutations:update', payload)
      }
      after(() => {
        transmitter.emit('mutations:update', createMutationEntryPayload(entry))
      })
      onError(() => {
        transmitter.emit('mutations:update', createMutationEntryPayload(entry))
      })
    } else if (name === 'create') {
      after((entry) => {
        // avoid displaying temporary entries
        if (entry.id > 0) {
          transmitter.emit('mutations:update', createMutationEntryPayload(entry))
        }
      })
    }
  })

  transmitter.on('queries:refetch', (key) => {
    queryCache.invalidateQueries({ key, exact: true }, 'all')
  })

  transmitter.on('queries:invalidate', (key) => {
    queryCache.invalidateQueries({ key, exact: true })
  })

  transmitter.on('queries:reset', (key) => {
    const entry = queryCache.getEntries({ key, exact: true })[0]
    if (entry) {
      queryCache.cancel(entry)
      queryCache.setEntryState(entry, {
        status: 'pending',
        data: undefined,
        error: null,
      })
    }
  })

  transmitter.on('queries:set:state', (key, state) => {
    const entry = queryCache.getEntries({ key, exact: true })[0]
    if (entry) {
      queryCache.setEntryState(entry, state)
      transmitter.emit('queries:update', createQueryEntryPayload(entry))
    }
  })

  transmitter.on('queries:simulate:loading', (key) => {
    const entry = queryCache.getEntries({ key, exact: true })[0]
    if (entry) {
      entry.asyncStatus.value = 'loading'
      ensureQueryDevtoolsInfo(entry).simulate = 'loading'
      const payload = createQueryEntryPayload(entry)
      // plugins may defer the ref write (e.g. the delay plugin), but the
      // devtools must reflect the simulation immediately
      payload.asyncStatus = 'loading'
      transmitter.emit('queries:update', payload)
    }
  })
  transmitter.on('queries:simulate:loading:stop', (key) => {
    const entry = queryCache.getEntries({ key, exact: true })[0]
    if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'loading') {
      entry.asyncStatus.value = 'idle'
      ensureQueryDevtoolsInfo(entry).simulate = null
      const payload = createQueryEntryPayload(entry)
      payload.asyncStatus = 'idle'
      transmitter.emit('queries:update', payload)
    }
  })

  transmitter.on('queries:simulate:error', (key) => {
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
      transmitter.emit('queries:update', createQueryEntryPayload(entry))
    }
  })

  transmitter.on('queries:simulate:error:stop', (key) => {
    const entry = queryCache.getEntries({ key, exact: true })[0]
    if (entry && ensureQueryDevtoolsInfo(entry).simulate === 'error') {
      queryCache.cancel(entry)
      queryCache.setEntryState(entry, {
        ...entry.state.value,
        status: entry.state.value.data !== undefined ? 'success' : 'pending',
        error: null,
      })
      ensureQueryDevtoolsInfo(entry).simulate = null
      transmitter.emit('queries:update', createQueryEntryPayload(entry))
    }
  })

  transmitter.on('mutations:clear', (filters = {}) => {
    const entries = mutationCache.getEntries(filters)
    entries.forEach((entry) => mutationCache.remove(entry))
  })

  transmitter.on('mutations:remove', (id) => {
    const entry = mutationCache.get(id)
    if (entry) {
      mutationCache.remove(entry)
    }
  })

  transmitter.on('mutations:simulate:loading', (id) => {
    const entry = mutationCache.get(id)
    if (entry) {
      entry.asyncStatus.value = 'loading'
      ensureMutationDevtoolsInfo(entry).simulate = 'loading'
      const payload = createMutationEntryPayload(entry)
      // plugins may defer the ref write (e.g. the delay plugin), but the
      // devtools must reflect the simulation immediately
      payload.asyncStatus = 'loading'
      transmitter.emit('mutations:update', payload)
    }
  })

  transmitter.on('mutations:simulate:loading:stop', (id) => {
    const entry = mutationCache.get(id)
    if (entry && ensureMutationDevtoolsInfo(entry).simulate === 'loading') {
      entry.asyncStatus.value = 'idle'
      ensureMutationDevtoolsInfo(entry).simulate = null
      const payload = createMutationEntryPayload(entry)
      payload.asyncStatus = 'idle'
      transmitter.emit('mutations:update', payload)
    }
  })

  transmitter.on('mutations:simulate:error', (id) => {
    const entry = mutationCache.get(id)
    if (entry) {
      mutationCache.setEntryState(entry, {
        ...entry.state.value,
        status: 'error',
        error: new Error('Simulated error'),
      })
      // we set after because setting the entry state resets the simulation
      ensureMutationDevtoolsInfo(entry).simulate = 'error'
      transmitter.emit('mutations:update', createMutationEntryPayload(entry))
    }
  })

  transmitter.on('mutations:simulate:error:stop', (id) => {
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
      transmitter.emit('mutations:update', createMutationEntryPayload(entry))
    }
  })

  transmitter.on('mutations:replay', (id) => {
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
  })

  return {
    sendAll: () => {
      transmitter.emit('queries:all', queryCache.getEntries().map(createQueryEntryPayload))
      transmitter.emit('mutations:all', mutationCache.getEntries().map(createMutationEntryPayload))
    },
  }
}

/**
 * Copies the `@property` rules from the devtools shadow root into the given
 * document. `@property` rules are ignored inside shadow DOM, so they must be
 * re-registered at the document level.
 */
export function attachCssPropertyRules(el: HTMLElement, doc: Document = document) {
  if (!el || !el.shadowRoot) {
    throw new Error('No devtools element found for Pinia Colada devtools')
  }

  const style = doc.getElementById('__pc-tw-properties') ?? doc.createElement('style')
  style.setAttribute('id', '__pc-tw-properties')

  const cssPropertyRulesText = Array.from(el.shadowRoot.styleSheets)
    .flatMap((s) => Array.from(s.cssRules))
    .filter((rule) => rule instanceof CSSPropertyRule)
    .map((rule) => rule.cssText)
    .join('')
  style.textContent = cssPropertyRulesText
  doc.head.appendChild(style)
}
