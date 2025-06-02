import type { DefineQueryOptions } from './define-query'
import type { EntryKeyTagged } from './entry-keys'
import type { ErrorDefault } from './types-extension'
import { useQuery } from './use-query'

/**
 * Tagged version of {@link DefineQueryOptions} that includes a key with
 * data type information.
 */
export interface DefineQueryOptionsTagged<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> extends DefineQueryOptions<TData, TError, TDataInitial> {
  key: EntryKeyTagged<TData, TDataInitial>
}

/**
 * Define dynamic query options by passing a function that accepts an arbitrary
 * parameter and returns the query options. Enables type-safe query keys.
 * Must be passed to {@link useQuery} alongside a getter for the params.
 *
 * @param setupOptions - A function that returns the query options.
 */
export function defineQueryOptions<
  Params,
  TData,
  TError,
  TDataInitial extends TData | undefined = undefined,
>(
  setupOptions: (params: Params) => DefineQueryOptions<TData, TError, TDataInitial>,
): (params: Params) => DefineQueryOptionsTagged<TData, TError, TDataInitial>

/**
 * Define static query options that are type safe with
 * `queryCache.getQueryData()`. Can be passed directly to {@link useQuery}.
 *
 * @param options - The query options.
 */
export function defineQueryOptions<
  TData,
  TError,
  TDataInitial extends TData | undefined = undefined,
>(
  options: DefineQueryOptions<TData, TError, TDataInitial>,
): DefineQueryOptionsTagged<TData, TError, TDataInitial>

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
