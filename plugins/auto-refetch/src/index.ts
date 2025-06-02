/**
 * Pinia Colada Auto Refetch plugin.
 *
 * Automatically refreshes queries when they become stale.
 *
 * @module @pinia/colada-plugin-auto-refetch
 */

import type { PiniaColadaPlugin, UseQueryEntry, UseQueryOptions } from '@pinia/colada'
import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/**
 * Options for the auto-refetch plugin.
 */
export interface PiniaColadaAutoRefetchOptions {
  /**
   * Whether to enable auto refresh by default.
   * @default false
   */
  autoRefetch?: MaybeRefOrGetter<boolean>
}

/**
 * To store timeouts in the entry extensions.
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
      entry: UseQueryEntry<unknown, unknown, unknown>,
      options: UseQueryOptions<unknown, unknown, unknown>,
    ) {
      if (!entry.active) return

      // Always clear existing timeout first
      clearTimeout(entry.ext[REFETCH_TIMEOUT_KEY])

      // Schedule next refetch
      const timeout = setTimeout(() => {
        if (options) {
          const entry: UseQueryEntry | undefined = queryCache.getEntries({
            key: toValue(options.key),
          })?.[0]
          if (entry && entry.active) {
            queryCache.refresh(entry).catch(console.error)
          }
        }
      }, options.staleTime)

      entry.ext[REFETCH_TIMEOUT_KEY] = timeout
    }

    queryCache.$onAction(({ name, args, after }) => {
      /**
       * Whether to schedule a refetch for the given entry
       */
      function shouldScheduleRefetch(options: UseQueryOptions<unknown, unknown, unknown>) {
        const queryEnabled = toValue(options.autoRefetch) ?? autoRefetch
        const staleTime = options.staleTime
        return Boolean(queryEnabled && staleTime)
      }

      // Trigger a fetch on creation to enable auto-refetch on initial load
      if (name === 'ensure') {
        const [options] = args
        after((entry) => {
          if (!shouldScheduleRefetch(options)) return
          scheduleRefetch(entry, options)
        })
      }

      // Set up auto-refetch on every fetch
      if (name === 'fetch') {
        const [entry] = args

        // Clear any existing timeout before scheduling a new one
        clearTimeout(entry.ext[REFETCH_TIMEOUT_KEY])

        after(async () => {
          if (!entry.options) return
          if (!shouldScheduleRefetch(entry.options)) return

          scheduleRefetch(entry, entry.options)
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
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryOptions<TData, TError, TDataInitial> extends PiniaColadaAutoRefetchOptions {}

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
