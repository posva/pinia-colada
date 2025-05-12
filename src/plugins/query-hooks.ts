import type { UseQueryEntry } from '../query-store'
import type { PiniaColadaPlugin } from '.'

/**
 * Options for {@link PiniaColadaQueryHooksPlugin}.
 */
export interface PiniaColadaQueryHooksPluginOptions {
  /**
   * Global handler for when a query is successful.
   *
   * @param data - data returned by the query
   */
  onSuccess?: <TData = unknown>(data: TData, entry: UseQueryEntry<TData, unknown>) => unknown

  /**
   * Global handler for when a query is settled (either successfully or with an error). Will await for the `onSuccess`
   * or `onError` handlers to resolve if they return a promise.
   *
   * @param data - data returned by the query if any
   * @param error - error thrown if any
   */
  onSettled?: <TData = unknown, TError = unknown>(
    data: TData | undefined,
    error: TError | null,
    entry: UseQueryEntry<TData, TError>,
  ) => unknown

  /**
   * Global error handler for all queries.
   *
   * @param error - error thrown
   */
  onError?: <TError = unknown>(error: TError, entry: UseQueryEntry<unknown, TError>) => unknown
}

/**
 * Allows to add global hooks to all queries:
 * - `onSuccess`: called when a query is successful
 * - `onError`: called when a query throws an error
 * - `onSettled`: called when a query is settled (either successfully or with an error)
 * @param options - Pinia Colada Query Hooks plugin options
 *
 * @example
 * ```ts
 * import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'
 *
 * const app = createApp(App)
 * // app setup with other plugins
 * app.use(PiniaColada, {
 *   plugins: [
 *     PiniaColadaQueryHooksPlugin({
 *       onError(error, entry) {
 *         // ...
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export function PiniaColadaQueryHooksPlugin(
  options: PiniaColadaQueryHooksPluginOptions,
): PiniaColadaPlugin {
  return ({ queryCache }) => {
    queryCache.$onAction(({ name, after, onError, args }) => {
      if (name === 'fetch') {
        const [entry] = args
        after(async ({ data }) => {
          await options.onSuccess?.(data, entry)
          options.onSettled?.(data, null, entry)
        })

        onError(async (error) => {
          await options.onError?.(error, entry)
          options.onSettled?.(undefined, error, entry)
        })
      }
    })
  }
}
