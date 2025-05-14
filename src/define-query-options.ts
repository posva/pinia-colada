import { toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { DefineQueryOptions } from './define-query'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'

/**
 * Define dynamic query options by passing a function that accepts an arbitrary
 * parameter and returns the query options. Enables type-safe query keys.
 * Must be called with {@link useDynamicQuery}.
 *
 * @param setupOptions - A function that returns the query options.
 */
export function defineQueryOptions<
  Params,
  TData,
  TError,
  TDataInitial extends TData | undefined = TData | undefined,
>(
  setupOptions: (params: Params) => DefineQueryOptions<TData, TError, TDataInitial>,
): (params: Params) => DefineQueryOptions<TData, TError, TDataInitial>

/**
 * Define static query options that are type safe with
 * `queryCache.getQueryData()`. Can be passed directly to {@link useQuery}.
 *
 * @param options - The query options.
 */
export function defineQueryOptions<
  TData,
  TError,
  TDataInitial extends TData | undefined = TData | undefined,
>(
  options: DefineQueryOptions<TData, TError, TDataInitial>,
): DefineQueryOptions<TData, TError, TDataInitial>

/**
 * Define type-safe query options. Can be static or dynamic. Define the arguments based
 * on what's needed on the query and the key. Use an object if you need
 * multiple properties.
 *
 * @param setupOrOptions - The query options or a function that returns the query options.
 *
 * @example
 * ```ts
 * import { defineQueryOptions } from '@pinia/colada'
 *
 * const documentDetailsQuery = defineQueryOptions((id: number ) => ({
 *   key: ['documents', id],
 *   query: () => fetchDocument(id),
 * }))
 *
 * queryCache.getQueryData(documentDetailsQuery(4).key) // typed
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function defineQueryOptions<const Options extends DefineQueryOptions, Params>(
  setupOrOptions: Options | ((params: Params) => Options),
): Options | ((params: Params) => Options) {
  return setupOrOptions
}

/**
 * NOTE: intentionally split `useQuery` and `useDynamicQuery`:
 * - Simpler types
 * - Test out the API without interfering with the core useQuery API
 */

/**
 * Like {@link useQuery} but allows for typed query keys. Requires options
 * defined with {@link defineQueryOptions}.
 *
 * @param setupOptions - options defined with {@link defineQueryOptions}
 * @param paramsGetter - a getter or ref that returns the parameters for the `setupOptions`
 *
 * @example
 * ```ts
 * import { defineQueryOptions, useDynamicQuery } from '@pinia/colada'
 *
 * const documentDetailsQuery = defineQueryOptions((id: number ) => ({
 *   key: ['documents', id],
 *   query: () => fetchDocument(id),
 * }))
 *
 * useDynamicQuery(documentDetailsQuery, 4)
 * useDynamicQuery(documentDetailsQuery, () => route.params.id)
 * useDynamicQuery(documentDetailsQuery, () => props.id)
 * ```
 */
export function useDynamicQuery<Params, TData, TError, TDataInitial extends TData | undefined>(
  setupOptions: (params: Params) => DefineQueryOptions<TData, TError, TDataInitial>,
  paramsGetter: MaybeRefOrGetter<NoInfer<Params>>,
): UseQueryReturn<TData, TError, TDataInitial> {
  return useQuery<TData, TError, TDataInitial>(() => setupOptions(toValue(paramsGetter)))
}
