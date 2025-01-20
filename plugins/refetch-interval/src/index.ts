import type { PiniaColadaPluginContext } from '@pinia/colada'
import { toValue } from 'vue'
/**
 * @module @pinia/colada-plugin-refetch-interval
 */

/**
 * Options for the Pinia Colada Refetch Interval plugin.
 */
export interface RefetchIntervalOptions {
  /**
   * If set to a number, queries will continuously refetch at this frequency in milliseconds.
   * If set to false, no automatic refetching will occur.
   */
  refetchInterval?: number | false
  /**
   * If true, queries will continue to refetch while their tab/window is in the background.
   */
  refetchIntervalInBackground?: boolean
}

interface IntervalEntry {
  timeoutId: ReturnType<typeof setTimeout>
  lastUpdated: number
}

const REFETCH_INTERVAL_OPTIONS_DEFAULTS = {
  refetchInterval: false,
  refetchIntervalInBackground: false,
} satisfies Required<RefetchIntervalOptions>

/**
 * Plugin that adds the ability to refetch queries at regular intervals.
 *
 * @param globalOptions - global options for the intervals
 */
export function PiniaColadaRefetchInterval(
  globalOptions?: RefetchIntervalOptions,
): (context: PiniaColadaPluginContext) => void {
  const defaults = { ...REFETCH_INTERVAL_OPTIONS_DEFAULTS, ...globalOptions }

  return ({ queryCache }) => {
    const intervalMap = new Map<string, IntervalEntry>()

    let isDocumentVisible = typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true

    if (typeof document !== 'undefined') {
      const visibilityCallback = () => {
        isDocumentVisible = document.visibilityState === 'visible'
      }
      document.addEventListener('visibilitychange', visibilityCallback)
    }

    queryCache.$onAction(({ name, args, after }) => {
      // cleanup intervals when data is deleted
      if (name === 'remove') {
        const [cacheEntry] = args
        const key = cacheEntry.key.join('/')
        const entry = intervalMap.get(key)
        if (entry) {
          clearTimeout(entry.timeoutId)
          intervalMap.delete(key)
        }
      }

      // Continue only if the action is a fetch
      if (name !== 'fetch') {
        return
      }

      const [queryEntry] = args

      // Get local options, falling back to global defaults
      const localOptions = queryEntry.options as RefetchIntervalOptions
      const options = {
        refetchInterval: localOptions?.refetchInterval ?? defaults.refetchInterval,
        refetchIntervalInBackground: localOptions?.refetchIntervalInBackground ?? defaults.refetchIntervalInBackground,
      } satisfies RefetchIntervalOptions

      const key = queryEntry.key.join('/')

      // Clear any existing interval
      const existingInterval = intervalMap.get(key)
      if (existingInterval) {
        clearTimeout(existingInterval.timeoutId)
        intervalMap.delete(key)
      }

      // If refetchInterval is false or not a number, don't set up a new interval
      if (!options.refetchInterval || typeof options.refetchInterval !== 'number') return

      after(() => {
        // Only set up new interval if the fetch was successful and the query is enabled
        if (queryEntry.state.value.status === 'success' && toValue(queryEntry.options?.enabled)) {
          const setupNextInterval = () => {
            const entry: IntervalEntry = {
              lastUpdated: Date.now(),
              timeoutId: setTimeout(() => {
                // Only refetch if refetchIntervalInBackground is true or document is visible
                if (options.refetchIntervalInBackground || isDocumentVisible) {
                  Promise.resolve(queryCache.fetch(queryEntry))
                    .catch(process.env.NODE_ENV !== 'test' ? console.error : () => {})
                    .finally(() => {
                      // Setup next interval after completion
                      setupNextInterval()
                    })
                } else {
                  // If we can't refetch now, try again after the interval
                  // setupNextInterval()

                  // If we can't refetch now, invalidate the query
                  queryCache.invalidate(queryEntry)
                }
              }, options.refetchInterval || 0),
            }
            intervalMap.set(key, entry)
          }

          setupNextInterval()
        }
      })
    })
  }
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseQueryOptions<TResult, TError> {
    /**
     * If set to a number, queries will continuously refetch at this frequency in milliseconds.
     * If set to false, no automatic refetching will occur.
     */
    refetchInterval?: number | false
    /**
     * If true, queries will continue to refetch while their tab/window is in the background.
     */
    refetchIntervalInBackground?: boolean
  }
}
