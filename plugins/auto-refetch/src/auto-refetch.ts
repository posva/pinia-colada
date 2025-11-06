/**
 * Pinia Colada Auto Refetch plugin.
 *
 * Automatically refreshes queries when they become stale.
 *
 * @module @pinia/colada-plugin-auto-refetch
 */

import {
  _toValueWithArgs,
  type PiniaColadaPlugin,
  type UseQueryEntry,
  type UseQueryOptions,
  type DataState,
  type UseQueryOptionsWithDefaults,
} from '@pinia/colada'
import { toValue } from 'vue'

/**
 * Options for the auto-refetch plugin.
 */
export interface PiniaColadaAutoRefetchOptions<
  TData = unknown,
  TError = unknown,
  // TODO: should be undefined?
  TDataInitial = unknown,
> {
  /**
   * Whether to enable auto refresh by default.
   * @default false
   */
  autoRefetch?:
    | boolean
    | number
    // FIXME: implement without the extended type Param
    | (<T extends DataState<TData, TError, TDataInitial>>(state: T) => boolean | number)
  // | ((state: DataState<TData, TError, TDataInitial>) => boolean | number)
}

/**
 * To store timeouts in the entry extensions.
 *
 * @internal
 */
const REFETCH_TIMEOUT_KEY = Symbol()
export { REFETCH_TIMEOUT_KEY as _REFETCH_TIMEOUT_KEY }

/**
 * Plugin that automatically refreshes queries when they become stale
 */
export function PiniaColadaAutoRefetch(
  options: PiniaColadaAutoRefetchOptions = {},
): PiniaColadaPlugin {
  const { autoRefetch = false } = options

  return ({ queryCache }) => {
    // Skip setting auto-refetch on the server
    if (typeof document === 'undefined') return

    function scheduleRefetch(
      // TODO: should be undefined
      entry: UseQueryEntry<unknown, unknown, unknown>,
      delayMs: number,
    ) {
      if (!entry.active) return

      // Always clear existing timeout first
      clearTimeout(entry.ext[REFETCH_TIMEOUT_KEY])

      // Schedule next refetch
      const timeout = setTimeout(() => {
        if (entry?.active && entry.options && toValue(entry.options.enabled)) {
          queryCache.fetch(entry).catch(console.error)
        }
      }, delayMs)

      entry.ext[REFETCH_TIMEOUT_KEY] = timeout
    }

    queryCache.$onAction(({ name, args, after }) => {
      /**
       * Whether to schedule a refetch for the given entry and determine the interval
       * Returns { shouldSchedule: boolean, interval?: number }
       */
      function shouldScheduleRefetch({
        state,
        options,
      }: UseQueryEntry<unknown, unknown, unknown>): number | false {
        const autoRefetchValue =
          !!options && _toValueWithArgs(options.autoRefetch ?? autoRefetch, state.value)
        return (
          !!options &&
          toValue(options.enabled) &&
          (autoRefetchValue === true ? options.staleTime! : autoRefetchValue)
        )
      }

      // Trigger a fetch on creation to enable auto-refetch on initial load
      if (name === 'ensure') {
        after((entry) => {
          // after ensure, options are always defined
          const interval = shouldScheduleRefetch(entry)
          if (interval) {
            scheduleRefetch(entry, interval)
          }
        })
      }

      // Set up auto-refetch on every fetch
      if (name === 'fetch') {
        const [entry] = args

        // Clear any existing timeout before scheduling a new one
        clearTimeout(entry.ext[REFETCH_TIMEOUT_KEY])

        after(async () => {
          if (!entry.options) return
          const interval = shouldScheduleRefetch(entry)
          if (interval) {
            scheduleRefetch(entry, interval)
          }
        })
      }

      // Clean up timeouts when entry is removed
      if (name === 'remove') {
        const [entry] = args
        clearTimeout(entry.ext[REFETCH_TIMEOUT_KEY])
      }
    })
  }
}

// Add types for the new option
declare module '@pinia/colada' {
  interface UseQueryOptions<TData, TError, TDataInitial>
    extends PiniaColadaAutoRefetchOptions<TData, TError, TDataInitial> {}

  interface UseQueryOptionsGlobal extends PiniaColadaAutoRefetchOptions {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntryExtensions<TData, TError, TDataInitial> {
    /**
     * Used to store the timeout for the auto-refetch plugin.
     * @internal
     */
    [REFETCH_TIMEOUT_KEY]?: ReturnType<typeof setTimeout>
  }
}
