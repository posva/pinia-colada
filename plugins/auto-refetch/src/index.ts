import type { PiniaColadaPlugin } from '@pinia/colada'

export interface PiniaColadaAutoRefetchOptions {
  /**
   * Whether to enable auto refresh by default.
   * @default true
   */
  enabled?: boolean
}

/**
 * Plugin that automatically refreshes queries when they become stale
 */
export function PiniaColadaAutoRefetch(
  options: PiniaColadaAutoRefetchOptions = {},
): PiniaColadaPlugin {
  const { enabled = true } = options

  return ({ queryCache }) => {
    // Keep track of active entries and their timeouts
    const refetchTimeouts = new Map<string, NodeJS.Timeout>()

    queryCache.$onAction(({ name, args, after }) => {
      // We want refetch to happen only on the client
      if (!import.meta.client) return

      // Handle fetch to set up auto-refetch
      if (name === 'refresh') {
        const [entry] = args
        const key = entry.key.join('/')

        after(async () => {
          // Skip if auto-refetch is disabled or if the query has no stale time
          const queryEnabled = entry.options?.autoRefetch ?? enabled
          const staleTime = entry.options?.staleTime
          if (!queryEnabled || !staleTime || !entry.active) return

          // Clear any existing timeout for this key
          const existingTimeout = refetchTimeouts.get(key)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }

          // Schedule next refetch
          const timeout = setTimeout(() => {
            if (entry.active && entry.options) {
              queryCache.refresh(entry).catch(console.error)
              refetchTimeouts.delete(key)
            }
          }, staleTime)

          refetchTimeouts.set(key, timeout)
        })
      }

      // Clean up timeouts when entry is removed
      if (name === 'remove') {
        const [entry] = args
        const key = entry.key.join('/')
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
    autoRefetch?: boolean
  }
}
