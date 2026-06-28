/**
 * Pinia Colada Cache Persister plugin.
 *
 * Persists the query cache to storage and restores it on startup.
 *
 * @module @pinia/colada-plugin-cache-persister
 */
import type {
  PiniaColadaPluginContext,
  UseQueryEntryFilter,
  _UseQueryEntryNodeValueSerialized,
} from '@pinia/colada'
import { hydrateQueryCache, _queryEntry_toJSON } from '@pinia/colada'

type MaybePromise<T> = T | Promise<T>

/**
 * Plain object the query cache is reduced to before being persisted. This is what custom
 * {@link CachePersisterOptions.stringify} and {@link CachePersisterOptions.parse} receive.
 */
export type PersistedQueryCache = Record<string, _UseQueryEntryNodeValueSerialized>

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

  /**
   * Stringifies the query cache before storing it. Defaults to `JSON.stringify`. Pass a codec like
   * [devalue](https://github.com/sveltejs/devalue) to preserve `Date`, `Map`, custom classes, etc.
   * @default JSON.stringify
   */
  stringify?: (cache: PersistedQueryCache) => string

  /**
   * Parses the stored query cache before hydrating it. Must be the counterpart of
   * {@link CachePersisterOptions.stringify}.
   * @default JSON.parse
   */
  parse?: (stored: string) => PersistedQueryCache

  /**
   * Called when serializing the cache with {@link CachePersisterOptions.stringify} throws, e.g. on
   * non-serializable data. In development, defaults to `console.error`.
   */
  onStringifyError?: (error: unknown) => void

  /**
   * Called when parsing the stored cache with {@link CachePersisterOptions.parse} throws, e.g. on
   * corrupt data. In development, defaults to `console.error`.
   */
  onParseError?: (error: unknown) => void
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
    stringify = JSON.stringify,
    parse = JSON.parse,
    onStringifyError,
    onParseError,
  } = options

  return ({ queryCache }) => {
    let throttleTimeout: ReturnType<typeof setTimeout> | undefined
    let pendingPersist = false

    // Serialize filtered entries (excluding error entries)
    function serializeCache(): PersistedQueryCache {
      return Object.fromEntries(
        // TODO: 2028: directly use .map on the iterator
        queryCache
          .getEntries({
            ...filter,
            // we only care about entries with data
            status: 'success',
          })
          .map((entry) => [entry.keyHash, _queryEntry_toJSON(entry)]),
      )
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
        try {
          const serialized = stringify(serializeCache())
          // storage write errors (quota, etc.) are ignored
          Promise.resolve()
            .then(() => storage.setItem(key, serialized))
            .catch(() => {})
        } catch (error) {
          onStringifyError?.(error)
          if (process.env.NODE_ENV !== 'production' && !onStringifyError) {
            console.error(
              '[@pinia/colada-plugin-cache-persister] Failed to serialize the cache for persistence. Pass `onStringifyError` to handle this.',
              error,
            )
          }
        } finally {
          // always reset the throttle so a later change can persist again
          throttleTimeout = undefined
          if (pendingPersist) {
            pendingPersist = false
            schedulePersist()
          }
        }
      }, debounce)
    }

    // Restore from storage
    async function restoreCache(): Promise<void> {
      try {
        const storedPromise = storage?.getItem(key)
        // avoid one extra await if storage is sync
        const stored = storedPromise instanceof Promise ? await storedPromise : storedPromise
        if (stored) {
          hydrateQueryCache(queryCache, parse(stored))
        }
      } catch (error) {
        // corrupt data, start fresh
        onParseError?.(error)
        if (process.env.NODE_ENV !== 'production' && !onParseError) {
          console.error(
            '[@pinia/colada-plugin-cache-persister] Failed to parse the persisted cache, starting fresh. Pass `onParseError` to handle this.',
            error,
          )
        }
      } finally {
        // always mark the cache ready so `isCacheReady()` never hangs
        readyResolve()
      }
    }

    // Start restoration immediately. The cache is already marked ready inside,
    // so a throwing onParseError must not surface as an unhandled rejection.
    restoreCache().catch(() => {})

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
