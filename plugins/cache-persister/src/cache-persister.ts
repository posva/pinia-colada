/**
 * Pinia Colada Cache Persister plugin.
 *
 * Persists the query cache to storage and restores it on startup.
 *
 * @module @pinia/colada-plugin-cache-persister
 */
import type {
  PiniaColadaPluginContext,
  UseQueryEntry,
  UseQueryEntryFilter,
  _UseQueryEntryNodeValueSerialized,
} from '@pinia/colada'
import { hydrateQueryCache, _queryEntry_toJSON } from '@pinia/colada'

type MaybePromise<T> = T | Promise<T>

/**
 * Async storage interface for storage backends that return promises.
 * Compatible with `Storage` type.
 *
 * @see Storage
 */
export interface PiniaColadaStorage {
  /**
   * Method to get an item from storage.
   *
   * @param key - The storage key
   */
  getItem(key: string): MaybePromise<string | null>

  /**
   * Method to set an item in storage.
   *
   * @param key - The storage key
   * @param value - The value to store
   */
  setItem(key: string, value: string): MaybePromise<void>

  /**
   * Optional method to remove an item from storage.
   */
  removeItem?(key: string): MaybePromise<void>
}

/**
 * Options for the cache persister plugin.
 */
export interface CachePersisterOptions {
  /**
   * Storage key used to persist the cache.
   * @default 'pinia-colada-cache'
   */
  key?: string

  /**
   * Storage backend to use. Can be sync (localStorage) or async.
   * @default localStorage
   */
  storage?: PiniaColadaStorage

  /**
   * Filter to select which queries to persist.
   * If not provided, all queries are persisted.
   */
  filter?: UseQueryEntryFilter

  /**
   * Debounce time in milliseconds before persisting.
   * @default 1000
   */
  debounce?: number
}

const DEFAULT_OPTIONS = {
  key: 'pinia-colada-cache',
  debounce: 1000,
} as const satisfies CachePersisterOptions

// Module-level state for cache ready promise
let readyResolve: () => void
let readyPromise: Promise<void> = new Promise<void>((resolve) => (readyResolve = resolve))

/**
 * Returns a promise that resolves when the cache has been restored from storage.
 * Call this before rendering your app to ensure cached data is available.
 *
 * @example
 * ```ts
 * import { isCacheReady } from '@pinia/colada-plugin-cache-persister'
 *
 * async function main() {
 *   const app = createApp(App)
 *   app.use(pinia)
 *   app.use(PiniaColada, {
 *     plugins: [PiniaColadaCachePersister()]
 *   })
 *
 *   await isCacheReady()
 *   app.mount('#app')
 * }
 * ```
 */
export const isCacheReady: () => Promise<void> = () => readyPromise

/**
 * Resets the cache ready state. Used for testing.
 * @internal
 */
export function resetCacheReady(): void {
  readyPromise = new Promise<void>((resolve) => (readyResolve = resolve))
}

/**
 * Plugin that persists the query cache to storage.
 *
 * @param options - Configuration options
 */
export function PiniaColadaCachePersister(
  options: CachePersisterOptions = {},
): (context: PiniaColadaPluginContext) => void {
  const {
    key = DEFAULT_OPTIONS.key,
    storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
    filter,
    debounce = DEFAULT_OPTIONS.debounce,
  } = options

  return ({ queryCache }) => {
    let throttleTimeout: ReturnType<typeof setTimeout> | undefined
    let pendingPersist = false

    // Serialize filtered entries (excluding error entries)
    function serializeCache(): _UseQueryEntryNodeValueSerialized[] {
      return queryCache
        .getEntries({
          ...filter,
          // we only care about entries with data
          status: 'success',
        })
        .map(_queryEntry_toJSON)
    }

    // Persist to storage (throttled with trailing)
    function schedulePersist(): void {
      if (!storage) return

      if (throttleTimeout) {
        // Already scheduled, mark pending for trailing call
        pendingPersist = true
        return
      }

      throttleTimeout = setTimeout(() => {
        const serialized = serializeCache()
        // Handle both sync and async storage errors
        Promise.resolve(storage.setItem(key, JSON.stringify(serialized))).catch(() => {
          // Ignore storage errors (quota exceeded, etc.)
        })

        throttleTimeout = undefined
        if (pendingPersist) {
          pendingPersist = false
          schedulePersist()
        }
      }, debounce)
    }

    // Restore from storage
    async function restoreCache(): Promise<void> {
      if (!storage) {
        readyResolve()
        return
      }

      try {
        const storedPromise = storage.getItem(key)
        // avoid one extra await if storage is sync
        const stored = storedPromise instanceof Promise ? await storage.getItem(key) : storedPromise
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, _UseQueryEntryNodeValueSerialized>
          hydrateQueryCache(queryCache, parsed)
        }
      } catch {
        // Ignore parse errors, start fresh
      }

      readyResolve()
    }

    // Start restoration immediately
    restoreCache()

    // Hook into cache actions to trigger persistence
    queryCache.$onAction(({ name, after }) => {
      if (name === 'setEntryState' || name === 'setQueryData' || name === 'remove') {
        after(() => {
          schedulePersist()
        })
      }
    })
  }
}
