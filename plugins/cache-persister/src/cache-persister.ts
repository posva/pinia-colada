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
import { diagnostics } from './diagnostics'

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
   * Called when persisting the cache fails, either because serializing it with
   * {@link CachePersisterOptions.stringify} throws (e.g. non-serializable data) or because the
   * storage write fails (e.g. quota exceeded). In development, defaults to `console.error`.
   * The handler must not throw: errors it throws are only caught and logged in development,
   * in production they break cache persistence.
   */
  onStringifyError?: (error: unknown) => void

  /**
   * Called when parsing the stored cache with {@link CachePersisterOptions.parse} throws, e.g. on
   * corrupt data. In development, defaults to `console.error`.
   * The handler must not throw: errors it throws are only caught and logged in development,
   * in production they prevent {@link isCacheReady} from resolving.
   */
  onParseError?: (error: unknown) => void
}

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
    key = 'pinia-colada-cache',
    storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
    filter,
    debounce = 1000,
    stringify = JSON.stringify,
    parse = JSON.parse,
    onStringifyError,
    onParseError,
  } = options

  return ({ queryCache }) => {
    // nothing to restore or persist without a storage (e.g. SSR)
    if (!storage) {
      readyResolve()
      return
    }

    let throttleTimeout: ReturnType<typeof setTimeout> | undefined
    let pendingPersist = false

    async function persist(): Promise<void> {
      try {
        // serialize or storage write may throw (non-serializable data, quota exceeded, …)
        await storage!.setItem(
          key,
          stringify(
            Object.fromEntries(
              queryCache
                // we only care about entries with data
                .getEntries({ ...filter, status: 'success' })
                .map((entry) => [entry.keyHash, _queryEntry_toJSON(entry)]),
            ),
          ),
        )
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          // in production the handler error is not caught and breaks the throttle,
          // stopping any further persistence, so surface it loudly in dev
          if (onStringifyError) {
            try {
              onStringifyError(error)
            } catch (handlerError) {
              diagnostics.PINIA_COLADA_CACHE_PERSISTER_R0002(
                { cause: handlerError },
                { method: 'error' },
              )
            }
          } else {
            diagnostics.PINIA_COLADA_CACHE_PERSISTER_R0001({ cause: error }, { method: 'error' })
          }
        } else {
          ;(onStringifyError ?? console.error)(error)
        }
      }
      // reset the throttle so a later change can persist again
      throttleTimeout = undefined
      if (pendingPersist) {
        pendingPersist = false
        schedulePersist()
      }
    }

    // Persist to storage (throttled with trailing)
    function schedulePersist(): void {
      if (throttleTimeout) {
        // Already scheduled, mark pending for trailing call
        pendingPersist = true
      } else {
        throttleTimeout = setTimeout(persist, debounce)
      }
    }

    async function restore(): Promise<void> {
      try {
        const raw = storage!.getItem(key)
        // hydrate synchronously with sync storages like localStorage so entries
        // exist before queries created in the same tick fetch
        const stored = raw instanceof Promise ? await raw : raw
        if (stored) {
          hydrateQueryCache(queryCache, parse(stored))
        }
      } catch (error) {
        // corrupt data, start fresh
        if (process.env.NODE_ENV !== 'production') {
          // in production the handler error is not caught and prevents `isCacheReady()`
          // from resolving, so surface it loudly in dev
          if (onParseError) {
            try {
              onParseError(error)
            } catch (handlerError) {
              diagnostics.PINIA_COLADA_CACHE_PERSISTER_R0004(
                { cause: handlerError },
                { method: 'error' },
              )
            }
          } else {
            diagnostics.PINIA_COLADA_CACHE_PERSISTER_R0003({ cause: error }, { method: 'error' })
          }
        } else {
          ;(onParseError ?? console.error)(error)
        }
      }
      readyResolve()
    }

    restore()

    // Hook into cache actions to trigger persistence
    queryCache.$onAction(({ name, after }) => {
      if (name === 'setEntryState' || name === 'setQueryData' || name === 'remove') {
        after(schedulePersist)
      }
    })
  }
}
