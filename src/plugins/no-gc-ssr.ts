import type { PiniaColadaPlugin } from '.'
import { useMutationCache } from '../mutation-store'

/**
 * Forces `gcTime: false` on every query and mutation entry, so no garbage
 * collection timers are scheduled. Designed for SSR / SSG / build pipelines
 * where pending `setTimeout` calls keep the Node.js process alive after
 * rendering completes, and where setTimeout closures retain entry memory
 * across requests.
 *
 * Apply conditionally — usually only on the server.
 *
 * @example
 * ```ts
 * import { PiniaColada, PiniaColadaSSRNoGc } from '@pinia/colada'
 *
 * app.use(PiniaColada, {
 *   plugins: import.meta.env.SSR ? [PiniaColadaSSRNoGc()] : [],
 * })
 * ```
 */
export function PiniaColadaSSRNoGc(): PiniaColadaPlugin {
  return ({ queryCache, pinia }) => {
    queryCache.$onAction(({ name, after }) => {
      if (name === 'ensure') {
        after((entry) => {
          if (entry.options) entry.options.gcTime = false
        })
      }
    })

    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, after }) => {
      if (name === 'extend') {
        after((entry) => {
          if (entry.options) entry.options.gcTime = false
        })
      }
    })
  }
}
