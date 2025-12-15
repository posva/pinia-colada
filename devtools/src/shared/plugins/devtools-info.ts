/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { DataState, UseQueryEntry } from '@pinia/colada'

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

export interface UseMutationDevtoolsInfo {
  updatedAt: number

  /**
   * When was this entry last inactive. 0 if it has never been inactive.
   */
  inactiveAt: number

  simulate: 'error' | 'loading' | null
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntry<TData, TError, TDataInitial> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    [DEVTOOLS_INFO_KEY]: UseQueryDevtoolsInfo
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseMutationEntry<TData, TVars, TError, TContext> {
    [DEVTOOLS_INFO_KEY]: UseMutationDevtoolsInfo
  }
}
