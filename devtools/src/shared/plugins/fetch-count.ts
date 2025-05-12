/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { DataState, QueryCache, UseQueryEntry } from '@pinia/colada'
import { toValue } from 'vue'

const now = () => performance.timeOrigin + performance.now()

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
          updatedAt: now(),
          inactiveAt: 0,
          simulate: null,
          history: [],
        }
      })
    } else if (name === 'fetch') {
      const [entry] = args
      entry[DEVTOOLS_INFO_KEY].count.total++
      entry[DEVTOOLS_INFO_KEY].updatedAt = now()
      const createdAt = now()
      const historyEntry: UseQueryEntryHistoryEntry = {
        id: (entry[DEVTOOLS_INFO_KEY].history.at(0)?.id ?? -1) + 1,
        key: entry.key,
        state: entry.state.value,
        updatedAt: createdAt,
        createdAt,
        fetchTime: null,
      }

      const isEnabled = toValue(entry.options?.enabled) ?? true
      if (isEnabled) {
        historyEntry.fetchTime = {
          start: createdAt,
          end: null,
        }
      }

      entry[DEVTOOLS_INFO_KEY].history.unshift(historyEntry)
      // limit history to 10 entries
      entry[DEVTOOLS_INFO_KEY].history = entry[DEVTOOLS_INFO_KEY].history.slice(0, 10)

      after(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          entry[DEVTOOLS_INFO_KEY].count.succeed++
          // set by the setEntryState
          // entry[DEVTOOLS_INFO_KEY].updatedAt = now()
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
      onError(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          entry[DEVTOOLS_INFO_KEY].count.errored++
          // set by the setEntryState
          // entry[DEVTOOLS_INFO_KEY].updatedAt = now()
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        entry[DEVTOOLS_INFO_KEY].count.cancelled++
      }
    } else if (name === 'setEntryState') {
      const [entry] = args
      let lastHistoryEntry = entry[DEVTOOLS_INFO_KEY].history[0]
      after(() => {
        entry[DEVTOOLS_INFO_KEY].updatedAt = now()
        lastHistoryEntry ??= entry[DEVTOOLS_INFO_KEY].history[0]
        if (lastHistoryEntry) {
          lastHistoryEntry.state = entry.state.value
          lastHistoryEntry.updatedAt = now()
        }
      })
    } else if (name === 'untrack') {
      const [entry] = args
      after(() => {
        if (!entry.active) {
          entry[DEVTOOLS_INFO_KEY].inactiveAt = now()
        }
      })
    } else if (name === 'setQueryData') {
      // setQueryData can also trigger gc
      const [key] = args
      after(() => {
        const entry = queryCache.getEntries({ key, exact: true })[0]
        if (entry && !entry.active) {
          entry[DEVTOOLS_INFO_KEY].inactiveAt = now()
        }
      })
    }
  })
}

export const DEVTOOLS_INFO_KEY = Symbol('fetch-count-pinia-colada-plugin')

export interface UseQueryEntryHistoryEntry extends Pick<UseQueryEntry, 'key'> {
  id: number

  state: DataState<unknown, unknown, unknown>

  /**
   * When was the last time the entry was updated.
   */
  updatedAt: number

  /**
   * When was the entry created.
   */
  createdAt: number

  /**
   * The time it took to fetch the entry.
   */
  fetchTime: {
    start: number
    end: number | null
  } | null
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
   * When was this entry last inactive. 0 if it has never been inactive.
   */
  inactiveAt: number

  simulate: 'error' | 'loading' | null

  /**
   * Only the last 10 entries are kept.
   */
  history: UseQueryEntryHistoryEntry[]
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntry<TData, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    [DEVTOOLS_INFO_KEY]: UseQueryDevtoolsInfo
  }
}

const installationMap = new WeakMap<object, boolean>()
