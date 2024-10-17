import type { PiniaColadaPluginContext } from '@pinia/colada'
/**
 * @module @pinia/colada-plugin-retry
 */

/**
 * Options for the Pinia Colada Retry plugin.
 */
export interface RetryOptions {
  /**
   * The delay between retries. Can be a duration in ms or a function that receives the attempt number (starts at 0) and returns a duration in ms. By default, it will wait 2^attempt * 1000 ms, but never more than 30 seconds.
   * @param attempt -
   * @returns
   */
  delay?: number | ((attempt: number) => number)

  /**
   * The maximum number of times to retry the operation. Set to 0 to disable or to Infinity to retry forever. It can also be a function that receives the failure count and the error and returns if it should retry. Defaults to 3. **Must be a positive number**.
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
    console.log(`⏲️ delaying attempt #${attempt + 1} by ${time}ms`)
    return time
  },
  retry: (count) => {
    console.log(
      `🔄 Retrying ${'🟨'.repeat(count + 1)}${'⬜️'.repeat(2 - count)}`,
    )
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

  return ({ queryCache }) => {
    const retryMap = new Map<string, RetryEntry>()

    let isInternalCall = false
    queryCache.$onAction(({ name, args, after, onError }) => {
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
      }

      const retryFetch = () => {
        if (queryEntry.state.value.status === 'error') {
          const error = queryEntry.state.value.error
          // ensure the entry exists
          let entry = retryMap.get(key)
          if (!entry) {
            entry = { retryCount: 0 }
            retryMap.set(key, entry)
          }

          const shouldRetry
            = typeof retry === 'number'
              ? retry > entry.retryCount
              : retry(entry.retryCount, error)

          if (shouldRetry) {
            const delayTime
              = typeof delay === 'function' ? delay(entry.retryCount) : delay
            entry.timeoutId = setTimeout(() => {
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
            retryMap.delete(key)
          }
        } else {
          // remove the entry if it worked out to reset it
          retryMap.delete(key)
        }
      }
      onError(retryFetch)
      after(retryFetch)
    })
  }
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseQueryOptions<TResult, TError> {
    /**
     * Options for the retries of this query added by `@pinia/colada-plugin-retry`.
     */
    retry?: RetryOptions | Exclude<RetryOptions['retry'], undefined>
  }
}
