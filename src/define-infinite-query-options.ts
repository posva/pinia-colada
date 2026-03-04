import type {
  DefineInfiniteQueryOptions,
  UseInfiniteQueryData,
  UseInfiniteQueryOptions,
} from './infinite-query'
import type { EntryKeyTagged } from './entry-keys'
import type { ErrorDefault } from './types-extension'
import { useInfiniteQuery } from './infinite-query'

/**
 * Tagged version of {@link DefineInfiniteQueryOptions} that includes a key with
 * data type information.
 */
export interface DefineInfiniteQueryOptionsTagged<
  TData = unknown,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
> extends DefineInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial> {
  key: EntryKeyTagged<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>
}

/**
 * Define dynamic infinite query options by passing a function that accepts an
 * optional arbitrary parameter and returns the query options. Enables type-safe
 * query keys. Pass to {@link useInfiniteQuery} as a single function:
 * `useInfiniteQuery(() => setupOptions(params))`.
 *
 * @param setupOptions - A function that returns the infinite query options.
 */
export function defineInfiniteQueryOptions<
  Params,
  TData,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
>(
  setupOptions: (
    params?: Params,
  ) => UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>,
): (params?: Params) => DefineInfiniteQueryOptionsTagged<TData, TError, TPageParam, TDataInitial>

/**
 * Define dynamic infinite query options by passing a function that accepts an
 * arbitrary parameter and returns the query options. Enables type-safe query
 * keys. Pass to {@link useInfiniteQuery} as a single function:
 * `useInfiniteQuery(() => setupOptions(params))`.
 *
 * @param setupOptions - A function that returns the infinite query options.
 */
export function defineInfiniteQueryOptions<
  Params,
  TData,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
>(
  setupOptions: (
    params: Params,
  ) => UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>,
): (params: Params) => DefineInfiniteQueryOptionsTagged<TData, TError, TPageParam, TDataInitial>

/**
 * Define static infinite query options that are type safe with
 * `queryCache.getQueryData()`. Can be passed directly to
 * {@link useInfiniteQuery}.
 *
 * @param options - The infinite query options.
 */
export function defineInfiniteQueryOptions<
  TData,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
>(
  options: UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>,
): DefineInfiniteQueryOptionsTagged<TData, TError, TPageParam, TDataInitial>

/**
 * Define type-safe infinite query options. Can be static or dynamic. Define the
 * arguments based on what's needed on the query and the key.
 *
 * @param setupOrOptions - The infinite query options or a function that returns
 *   them.
 *
 * @example
 * ```ts
 * import { defineInfiniteQueryOptions } from '@pinia/colada'
 *
 * const itemsQuery = defineInfiniteQueryOptions({
 *   key: ['items'],
 *   query: ({ pageParam }) => fetchItems(pageParam),
 *   initialPageParam: 0,
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * })
 *
 * queryCache.getQueryData(itemsQuery.key) // typed
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
export function defineInfiniteQueryOptions(
  setupOrOptions:
    | UseInfiniteQueryOptions<any, any, any, any>
    | ((...args: any[]) => UseInfiniteQueryOptions<any, any, any, any>),
) {
  return setupOrOptions
}
