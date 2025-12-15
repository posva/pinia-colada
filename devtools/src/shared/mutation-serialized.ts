import type { UseMutationEntry } from '@pinia/colada'
import type { DEVTOOLS_INFO_KEY } from './plugins/devtools-info'

export interface UseMutationEntryPayload {
  /**
   * Unique identifier for this mutation execution.
   */
  id: string

  /**
   * The full key including the ID (e.g., ['createTodo', '$0']).
   */
  key: UseMutationEntry['key']

  /**
   * Serialized key for cache lookup.
   */
  keyHash: string | undefined

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
   * DevTools-specific tracking info.
   */
  devtools: UseMutationEntry[typeof DEVTOOLS_INFO_KEY]
}

export interface UseMutationEntryPayloadOptions {
  gcTime: number | undefined
}
