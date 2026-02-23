/**
 * Pinia Colada Retry plugin.
 *
 * Adds the ability to retry failed queries.
 *
 * @module @pinia/colada-plugin-retry
 */
import type { PiniaColadaPluginContext } from '@pinia/colada'
import type { ShallowRef } from 'vue'
import { shallowRef, toValue } from 'vue'

/**
 * Options for the Pinia Colada Retry plugin.
 */
export interface RetryOptions {
  /**
   * The delay between retries. Can be a duration in ms or a function that
   * receives the attempt number (starts at 0) and returns a duration in ms. By
   * default, it will wait 2^attempt * 1000 ms, but never more than 30 seconds.
   *
   * @param attempt -
   * @returns
   */
  delay?: number | ((attempt: number) => number)

  /**
   * The maximum number of times to retry the operation. Set to 0 to disable or
   * to Infinity to retry forever. It can also be a function that receives the
   * failure count and the error and returns if it should retry. Defaults to 3.
   * **Must be a positive number**.
   */
  retry?: number | ((failureCount: number, error: unknown) => boolean)
}

export interface RetryEntry {
  retryCount: number
  timeoutId?: ReturnType<typeof setTimeout>
}

const RETRY_OPTIONS_DEFAULTS = {
  delay: (attempt: number) => {
    const time = Math.min(
      2 ** attempt * 1000,
      // never more than 30 seconds
      30_000,
    )
    if (process.env.NODE_ENV === 'development') {
      // oxlint-disable-next-line no-console
      console.debug(`⏲️ delaying attempt #${attempt + 1} by ${time}ms`)
    }
    return time
  },
  retry: (count) => {
    if (process.env.NODE_ENV === 'development') {
      // oxlint-disable-next-line no-console
      console.debug(`🔄 Retrying ${'🟨'.repeat(count + 1)}${'⬜️'.repeat(2 - count)}`)
    }
    return count < 2
  },
} satisfies Required<RetryOptions>

/**
 * Plugin that adds the ability to retry failed queries.
 *
 * @param globalOptions - global options for the retries
 */
export function PiniaColadaRetry(
  globalOptions?: RetryOptions,
): (context: PiniaColadaPluginContext) => void {
  const defaults = { ...RETRY_OPTIONS_DEFAULTS, ...globalOptions }

  return ({ queryCache, scope }) => {
    const retryMap = new Map<string, RetryEntry>()

    let isInternalCall = false
    queryCache.$onAction(({ name, args, after, onError }) => {
      if (name === 'extend') {
        const [entry] = args
        scope.run(() => {
          entry.ext.isRetrying = shallowRef(false)
          entry.ext.retryCount = shallowRef(0)
          entry.ext.retryError = shallowRef(null)
        })
        if (process.env.NODE_ENV === 'development') {
          entry.ext.retry = { isRetrying: false, retryCount: 0, retryError: null as unknown }
        }
        return
      }

      // cleanup all pending retries when data is deleted (means the data is not needed anymore)
      if (name === 'remove') {
        const [cacheEntry] = args
        const key = cacheEntry.key.join('/')
        const entry = retryMap.get(key)
        if (entry) {
          clearTimeout(entry.timeoutId)
          retryMap.delete(key)
        }
      }

      if (name !== 'fetch') return
      const [queryEntry] = args
      const localOptions = queryEntry.options?.retry

      const options = {
        ...(typeof localOptions === 'object'
          ? localOptions
          : {
              retry: localOptions,
            }),
      } satisfies RetryOptions

      const retry = options.retry ?? defaults.retry
      const delay = options.delay ?? defaults.delay
      // avoid setting up anything at all
      if (retry === 0) return

      const key = queryEntry.key.join('/')

      // clear any pending retry
      clearTimeout(retryMap.get(key)?.timeoutId)
      // if the user manually calls the action, reset the retry count
      if (!isInternalCall) {
        retryMap.delete(key)
        queryEntry.ext.isRetrying.value = false
        queryEntry.ext.retryCount.value = 0
        queryEntry.ext.retryError.value = null
        if (process.env.NODE_ENV === 'development' && queryEntry.ext.retry) {
          queryEntry.ext.retry.isRetrying = false
          queryEntry.ext.retry.retryCount = 0
          queryEntry.ext.retry.retryError = null
        }
      }

      // capture state before the fetch runs so we can revert during retries
      const previousState = queryEntry.state.value

      const retryFetch = () => {
        if (queryEntry.state.value.status === 'error') {
          const error = queryEntry.state.value.error
          // ensure the entry exists
          let entry = retryMap.get(key)
          if (!entry) {
            entry = { retryCount: 0 }
            retryMap.set(key, entry)
          }

          const shouldRetry =
            typeof retry === 'number' ? retry > entry.retryCount : retry(entry.retryCount, error)

          if (shouldRetry) {
            queryEntry.ext.isRetrying.value = true
            queryEntry.ext.retryCount.value = entry.retryCount + 1
            queryEntry.ext.retryError.value = error
            if (process.env.NODE_ENV === 'development' && queryEntry.ext.retry) {
              queryEntry.ext.retry.isRetrying = true
              queryEntry.ext.retry.retryCount = entry.retryCount + 1
              queryEntry.ext.retry.retryError = error
            }
            // revert to pre-fetch state so the error is only visible via retryError
            queryEntry.state.value = previousState
            const delayTime = typeof delay === 'function' ? delay(entry.retryCount) : delay
            entry.timeoutId = setTimeout(() => {
              if (!queryEntry.active || toValue(queryEntry.options?.enabled) === false) {
                retryMap.delete(key)
                queryEntry.ext.isRetrying.value = false
                queryEntry.ext.retryCount.value = 0
                queryEntry.ext.retryError.value = null
                if (process.env.NODE_ENV === 'development' && queryEntry.ext.retry) {
                  queryEntry.ext.retry.isRetrying = false
                  queryEntry.ext.retry.retryCount = 0
                  queryEntry.ext.retry.retryError = null
                }
                return
              }
              // NOTE: we could add some default error handler
              isInternalCall = true
              Promise.resolve(queryCache.fetch(queryEntry)).catch(
                process.env.NODE_ENV !== 'test' ? console.error : () => {},
              )
              isInternalCall = false
              if (entry) {
                entry.retryCount++
              }
            }, delayTime)
          } else {
            // remove the entry if we are not going to retry
            queryEntry.ext.isRetrying.value = false
            queryEntry.ext.retryError.value = null
            retryMap.delete(key)
            if (process.env.NODE_ENV === 'development' && queryEntry.ext.retry) {
              queryEntry.ext.retry.isRetrying = false
              queryEntry.ext.retry.retryError = null
            }
          }
        } else {
          // remove the entry if it worked out to reset it
          queryEntry.ext.isRetrying.value = false
          queryEntry.ext.retryCount.value = 0
          queryEntry.ext.retryError.value = null
          retryMap.delete(key)
          if (process.env.NODE_ENV === 'development' && queryEntry.ext.retry) {
            queryEntry.ext.retry.isRetrying = false
            queryEntry.ext.retry.retryCount = 0
            queryEntry.ext.retry.retryError = null
          }
        }
      }
      onError(retryFetch)
      after(retryFetch)
    })
  }
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseQueryOptions<TData, TError, TDataInitial> {
    /**
     * Options for the retries of this query added by `@pinia/colada-plugin-retry`.
     */
    retry?: RetryOptions | Exclude<RetryOptions['retry'], undefined>
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntryExtensions<TData, TError, TDataInitial> {
    /**
     * Whether the query is currently retrying. Requires the `@pinia/colada-plugin-retry` plugin.
     */
    isRetrying: ShallowRef<boolean>
    /**
     * The number of retries that have been scheduled so far. Resets on success or manual refetch.
     * Requires the `@pinia/colada-plugin-retry` plugin.
     */
    retryCount: ShallowRef<number>
    /**
     * The error that triggered the current retry. `null` when not retrying or when retries are exhausted.
     * Requires the `@pinia/colada-plugin-retry` plugin.
     */
    retryError: ShallowRef<TError | null>
    /**
     * Plain object with retry state for devtools. Only present in development mode.
     */
    retry?: { isRetrying: boolean; retryCount: number; retryError: unknown }
  }
}
