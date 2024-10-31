/**
 * @module @pinia/colada/plugins/delay
 */
import type { ShallowRef } from 'vue'
import { customRef, shallowRef } from 'vue'
import type { PiniaColadaPlugin, AsyncStatus } from '@pinia/colada'

/**
 * Options for the {@link PiniaColadaDelay} plugin.
 */
interface PiniaColadaDelayOptions {
  /**
   * Delay in milliseconds to wait before letting the `asyncStatus` become `'loading'`. Set to `false` or 0 to disable. Requires the {@link PiniaColadaDelay} plugin.
   * @default 200
   */
  delay?: number | false
}

/**
 * Delays the `asyncStatus` of a query by a certain amount of time to avoid flickering between refreshes.
 * @param options - Pinia Colada Delay Loading plugin options
 */
export function PiniaColadaDelay(options?: PiniaColadaDelayOptions): PiniaColadaPlugin {
  return ({ queryCache }) => {
    queryCache.$onAction(({ name, after }) => {
      if (name === 'create') {
        after((entry) => {
          const delay = entry.options?.delay ?? options?.delay ?? 200
          const isDelaying = shallowRef(false)
          entry.ext.isDelaying = isDelaying
          if (!delay) return

          const initialValue = entry.asyncStatus.value
          entry.asyncStatus = customRef<AsyncStatus>((track, trigger) => {
            let value = initialValue
            let timeout: ReturnType<typeof setTimeout> | undefined
            return {
              get() {
                track()
                return value
              },
              set(newValue) {
                clearTimeout(timeout)
                if (newValue === 'loading') {
                  isDelaying.value = true
                  timeout = setTimeout(() => {
                    isDelaying.value = false
                    value = newValue
                    trigger()
                  }, delay)
                } else {
                  isDelaying.value = false
                  value = newValue
                  trigger()
                }
              },
            }
          })
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryOptions<TResult, TError> extends PiniaColadaDelayOptions {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  interface UseQueryEntryExtensions<TResult, TError> {
    /**
     * Returns whether the query is currently delaying its `asyncStatus` from becoming `'loading'`. Requires the {@link PiniaColadaDelay} plugin.
     */
    isDelaying: ShallowRef<boolean>
  }
}
