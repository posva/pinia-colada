import type { PiniaColadaPluginContext } from '..'

export interface RetryOptions {
  /**
   * The delay between retries. Can be a duration in ms or a function that receives the attempt number (starts at 0) and returns a duration in ms. By default, it will wait 2^attempt * 1000 ms, but never more than 30 seconds.
   * @param attempt -
   * @returns
   */
  delay?: number | ((attempt: number) => number)

  /**
   * The maximum number of times to retry the operation. Set to 0 to disable or to Infinity to retry forever. It can also be a function that receives the failure count and the error and returns if it should retry. Defaults to 3.
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

export function PiniaColadaRetriesPlugin({ cache }: PiniaColadaPluginContext) {
  const retryMap = new Map<string, RetryEntry>()
  // FIXME: outside of scope
  // cleanup all pending retries and the map to avoid memory leaks
  // onScopeDispose(() => {
  //   for (const { timeoutId } of retryMap.values()) {
  //     clearTimeout(timeoutId)
  //   }
  //   retryMap.clear()
  // })

  let isInternalCall = false
  cache.$onAction(({ name, args, after, store }) => {
    if (name !== 'refetch' && name !== 'refresh') return

    const [queryEntry] = args
    const options = { ...RETRY_OPTIONS_DEFAULTS, ...queryEntry.options?.retry }

    // clear any pending retry
    clearTimeout(retryMap.get(name)?.timeoutId)
    // if the user manually calls the action, reset the retry count
    if (!isInternalCall) {
      retryMap.delete(name)
    }
    after(() => {
      if (queryEntry.status.value === 'error') {
        const error = queryEntry.error.value
        // ensure the entry exists
        let entry = retryMap.get(name)
        if (!entry) {
          entry = { retryCount: 0 }
          retryMap.set(name, entry)
        }

        const shouldRetry
          = typeof options.retry === 'number'
            ? options.retry > entry.retryCount
            : options.retry(entry.retryCount, error)

        if (shouldRetry) {
          const delay
            = typeof options.delay === 'function'
              ? options.delay(entry.retryCount)
              : options.delay
          entry.timeoutId = setTimeout(() => {
            // NOTE: we could add some default error handler
            isInternalCall = true
            Promise.resolve(store[name](queryEntry)).catch(
              process.env.NODE_ENV !== 'test' ? console.error : () => {},
            )
            isInternalCall = false
            if (entry) {
              entry.retryCount++
            }
          }, delay)
        } else {
          // remove the entry if we are not going to retry
          retryMap.delete(name)
        }
      } else {
        // remove the entry if it worked out to reset it
        retryMap.delete(name)
      }
    })
  })
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  export interface UseQueryOptions<TResult, TError> {
    retry?: RetryOptions
  }
}
