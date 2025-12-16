/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { DataState, UseQueryEntry } from '@pinia/colada'

export const DEVTOOLS_INFO_KEY = Symbol('fetch-count-pinia-colada-plugin')

/**
 * A single entry in the history of a query.
 * @see {UseQueryDevtoolsInfo.history}
 */
export interface UseQueryEntryHistoryEntry extends Pick<UseQueryEntry, 'key'> {
  /**
   * The unique ID of the entry in the history
   */
  id: number

  /**
   * The state of the entry at this point in time.
   */
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

/**
 * Common devtools info for both queries and mutations.
 */
export interface EntryDevtoolsInfo {
  /**
   * When was the last time the entry was updated.
   */
  updatedAt: number

  /**
   * When was this entry last inactive. 0 if it has never been inactive.
   */
  inactiveAt: number

  /**
   * Is this entry simulating an error or loading state.
   */
  simulate: 'error' | 'loading' | null
}

/**
 * Extended devtools info for queries.
 */
export interface UseQueryDevtoolsInfo extends EntryDevtoolsInfo {
  /**
   * How many times has this query been fetched, succeeded, errored, cancelled, etc.
   */
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

/**
 * Extended devtools info for mutations.
 */
export interface UseMutationDevtoolsInfo extends EntryDevtoolsInfo {}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntry<TData, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from
     * becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    [DEVTOOLS_INFO_KEY]: UseQueryDevtoolsInfo
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseMutationEntry<TData, TVars, TError, TContext> {
    [DEVTOOLS_INFO_KEY]: UseMutationDevtoolsInfo
  }
}
