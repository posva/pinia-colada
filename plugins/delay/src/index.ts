/**
 * @module @pinia/colada/plugins/delay
 */
import { customRef } from 'vue'
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
          console.log('delay', entry.options?.delay, options?.delay, delay)
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
                  timeout = setTimeout(() => {
                    value = newValue
                    trigger()
                  }, delay)
                } else {
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
  export interface UseQueryOptions<TResult, TError> extends PiniaColadaDelayOptions {}
}
