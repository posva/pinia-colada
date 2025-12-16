import type { UseMutationEntry } from '@pinia/colada'
import type { DEVTOOLS_INFO_KEY } from './plugins/devtools-info'

export interface UseMutationEntryPayload {
  /**
   * Unique numeric identifier for this mutation execution.
   */
  id: number

  /**
   * Optional user-defined key for grouping related mutations (e.g., ['createTodo']).
   */
  key: UseMutationEntry['key']

  /**
   * Current state (pending, success, error).
   */
  state: UseMutationEntry['state']['value']

  /**
   * Async status (idle, loading).
   */
  asyncStatus: UseMutationEntry['asyncStatus']['value']

  /**
   * When was this mutation last updated.
   */
  when: number

  /**
   * Variables passed to the mutation.
   */
  vars: unknown

  /**
   * Mutation options (gcTime, etc.).
   */
  options: UseMutationEntryPayloadOptions | null

  /**
   * GC timeout if scheduled.
   */
  gcTimeout: number | null

  /**
   * Whether the mutation is currently being used by a component or effect scope.
   */
  active: boolean

  /**
   * DevTools-specific tracking info.
   */
  devtools: UseMutationEntry[typeof DEVTOOLS_INFO_KEY]
}

export interface UseMutationEntryPayloadOptions {
  gcTime: number | undefined
}
