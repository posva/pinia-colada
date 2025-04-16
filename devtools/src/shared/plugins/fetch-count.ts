/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { DataState, QueryCache, UseQueryEntry } from '@pinia/colada'

export function addDevtoolsInfo(queryCache: QueryCache): void {
  if (installationMap.has(queryCache)) {
    return
  }
  installationMap.set(queryCache, true)

  queryCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'create') {
      after((entry) => {
        entry[DEVTOOLS_INFO_KEY] = {
          count: {
            total: 0,
            succeed: 0,
            errored: 0,
            cancelled: 0,
          },
          updatedAt: Date.now(),
          history: [],
        }
      })
    } else if (name === 'fetch') {
      const [entry] = args
      entry[DEVTOOLS_INFO_KEY].count.total++
      entry[DEVTOOLS_INFO_KEY].updatedAt = Date.now()
      const historyEntry: UseQueryEntryHistoryEntry = {
        key: entry.key,
        state: entry.state.value,
        updatedAt: Date.now(),
      }
      entry[DEVTOOLS_INFO_KEY].history.unshift(historyEntry)
      // limit history to 10 entries
      entry[DEVTOOLS_INFO_KEY].history = entry[DEVTOOLS_INFO_KEY].history.slice(0, 10)

      after(() => {
        entry[DEVTOOLS_INFO_KEY].count.succeed++
        entry[DEVTOOLS_INFO_KEY].updatedAt = Date.now()
        historyEntry.state = entry.state.value
        historyEntry.updatedAt = Date.now()
      })
      onError(() => {
        entry[DEVTOOLS_INFO_KEY].count.errored++
        entry[DEVTOOLS_INFO_KEY].updatedAt = Date.now()
        historyEntry.state = entry.state.value
        historyEntry.updatedAt = Date.now()
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        entry[DEVTOOLS_INFO_KEY].count.cancelled++
        entry[DEVTOOLS_INFO_KEY].updatedAt = Date.now()
      }
    } else if (name === 'setEntryState') {
      const [entry] = args
      let lastHistoryEntry = entry[DEVTOOLS_INFO_KEY].history[0]
      after(() => {
        entry[DEVTOOLS_INFO_KEY].updatedAt = Date.now()
        lastHistoryEntry ??= entry[DEVTOOLS_INFO_KEY].history[0]
        if (lastHistoryEntry) {
          lastHistoryEntry.state = entry.state.value
          lastHistoryEntry.updatedAt = Date.now()
        }
      })
    }
  })
}

export const DEVTOOLS_INFO_KEY = Symbol('fetch-count-pinia-colada-plugin')

export interface UseQueryEntryHistoryEntry extends Pick<UseQueryEntry, 'key'> {
  state: DataState<unknown, unknown, unknown>
  updatedAt: number
}

export interface UseQueryDevtoolsInfo {
  count: {
    succeed: number
    errored: number
    cancelled: number
    total: number
  }

  updatedAt: number

  /**
   * Only the last 10 entries are kept.
   */
  history: UseQueryEntryHistoryEntry[]
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntry<TResult, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    [DEVTOOLS_INFO_KEY]: UseQueryDevtoolsInfo
  }
}

const installationMap = new WeakMap<object, boolean>()
