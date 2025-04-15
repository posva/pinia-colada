/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */

import type { QueryCache } from '@pinia/colada'

/**
 * Delays the `asyncStatus` of a query by a certain amount of time to avoid flickering between refreshes.
 * @param options - Pinia Colada Delay Loading plugin options
 */
export function addRequestCount(queryCache: QueryCache): void {
  if (installationMap.has(queryCache)) {
    return
  }
  installationMap.set(queryCache, true)

  queryCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'create') {
      after((entry) => {
        entry[FETCH_COUNT_KEY] = {
          total: 0,
          success: 0,
          error: 0,
          cancelled: 0,
        }
      })
    } else if (name === 'fetch') {
      const [entry] = args
      entry[FETCH_COUNT_KEY].total++
      after(() => {
        entry[FETCH_COUNT_KEY].success++
      })
      onError(() => {
        entry[FETCH_COUNT_KEY].error++
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        entry[FETCH_COUNT_KEY].cancelled++
      }
    }
  })
}

export const FETCH_COUNT_KEY = Symbol('fetch-count-pinia-colada-plugin')

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntry<TResult, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    [FETCH_COUNT_KEY]: {
      total: number
      success: number
      error: number
      cancelled: number
    }
  }
}

const installationMap = new WeakMap<object, boolean>()
