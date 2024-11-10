import type { PiniaColadaPlugin, UseQueryEntry, UseQueryOptions } from '@pinia/colada'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

export interface PiniaColadaAutoRefetchOptions {
  /**
   * Whether to enable auto refresh by default.
   * @default false
   */
  autoRefetch?: boolean
}

const createMapKey = (options: UseQueryOptions) => toValue(options.key).join('/')

/**
 * Plugin that automatically refreshes queries when they become stale
 */
export function PiniaColadaAutoRefetch(
  options: PiniaColadaAutoRefetchOptions = {},
): PiniaColadaPlugin {
  const { autoRefetch = false } = options

  return ({ queryCache }) => {
    // Keep track of active entries and their timeouts
    const refetchTimeouts = new Map<string, NodeJS.Timeout>()

    queryCache.$onAction(({ name, args, after }) => {
      // We want refetch to happen only on the client
      if (typeof document === 'undefined') return

      function scheduleRefetch(options: UseQueryOptions) {
        const key = createMapKey(options)

        // Clear any existing timeout for this key
        const existingTimeout = refetchTimeouts.get(key)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Schedule next refetch
        const timeout = setTimeout(() => {
          if (options) {
            const entry: UseQueryEntry | undefined = queryCache.getEntries({
              key: toValue(options.key),
            })?.[0]
            if (entry) {
              queryCache.refresh(entry).catch(console.error)
            }
            refetchTimeouts.delete(key)
          }
        }, options.staleTime)

        refetchTimeouts.set(key, timeout)
      }

      /**
       * Whether to schedule a refetch for the given entry
       */
      function shouldScheduleRefetch(options: UseQueryOptions) {
        const queryEnabled = options.autoRefetch ?? autoRefetch
        const staleTime = options.staleTime
        return Boolean(queryEnabled && staleTime)
      }

      // Trigger a fetch on creation to enable auto-refetch on initial load
      if (name === 'ensure') {
        const [options] = args
        if (!shouldScheduleRefetch(options)) return

        scheduleRefetch(options)
      }

      // Set up auto-refetch on every fetch
      if (name === 'fetch') {
        const [entry] = args

        after(async () => {
          if (!entry.options) return
          if (!shouldScheduleRefetch(entry.options)) return

          scheduleRefetch(entry.options)
        })
      }

      // Clean up timeouts when entry is removed
      if (name === 'remove') {
        const [entry] = args
        if (!entry.options) return

        const key = createMapKey(entry.options)
        const timeout = refetchTimeouts.get(key)
        if (timeout) {
          clearTimeout(timeout)
          refetchTimeouts.delete(key)
        }
      }
    })
  }
}

// Add types for the new option
declare module '@pinia/colada' {
  interface UseQueryOptions {
    /**
     * Whether to automatically refresh this query when it becomes stale.
     */
    autoRefetch?: MaybeRefOrGetter<boolean>
  }
}
