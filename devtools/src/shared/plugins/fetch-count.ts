/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */

import type { AsyncStatus, DataState, QueryCache, UseQueryEntry } from '@pinia/colada'
import type { UnwrapRef } from 'vue'

/**
 * Delays the `asyncStatus` of a query by a certain amount of time to avoid flickering between refreshes.
 * @param options - Pinia Colada Delay Loading plugin options
 */
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
          history: [],
        }
      })
    } else if (name === 'fetch') {
      const [entry] = args
      entry[DEVTOOLS_INFO_KEY].count.total++
      after(() => {
        entry[DEVTOOLS_INFO_KEY].count.succeed++
        entry[DEVTOOLS_INFO_KEY].history.unshift({
          key: entry.key,
          state: entry.state.value,
          updatedAt: Date.now(),
        })
        // limit history to 10 entries
        entry[DEVTOOLS_INFO_KEY].history = entry[DEVTOOLS_INFO_KEY].history.slice(0, 10)
      })
      onError(() => {
        entry[DEVTOOLS_INFO_KEY].count.errored++
        entry[DEVTOOLS_INFO_KEY].history.unshift({
          key: entry.key,
          state: entry.state.value,
          updatedAt: Date.now(),
        })
        // limit history to 10 entries
        entry[DEVTOOLS_INFO_KEY].history = entry[DEVTOOLS_INFO_KEY].history.slice(0, 10)
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        entry[DEVTOOLS_INFO_KEY].count.cancelled++
      }
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
