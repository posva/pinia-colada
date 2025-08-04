import { toValue } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'
import { useQueryCache } from './query-store'

/**
 * Options for {@link useInfiniteQuery}.
 *
 * @experimental See https://github.com/posva/pinia-colada/issues/178
 */
export interface UseInfiniteQueryOptions<
  TData,
  TError,
  TDataInitial extends TData | undefined = TData | undefined,
  TPages = unknown,
> extends Omit<
    UseQueryOptions<TData, TError, TDataInitial>,
    'query' | 'initialData' | 'placeholderData' | 'key'
  > {
  key: UseQueryOptions<TPages, TError, TPages>['key']
  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (pages: NoInfer<TPages>, context: UseQueryFnContext) => Promise<TData>
  initialPage: TPages | (() => TPages)
  merge: (result: NoInfer<TPages>, current: NoInfer<TData>) => NoInfer<TPages>
}

export interface UseInfiniteQueryReturn<TPage = unknown, TError = ErrorDefault>
  extends Omit<UseQueryReturn<TPage, TError, TPage>, 'refetch' | 'refresh'> {
  loadMore: () => Promise<unknown>
}

/**
 * Store and merge paginated data into a single cache entry. Allows to handle
 * infinite scrolling. This is an **experimental** API and is subject to
 * change.
 *
 * @param options - Options to configure the infinite query.
 *
 * @experimental See https://github.com/posva/pinia-colada/issues/178
 */
export function useInfiniteQuery<TData, TError = ErrorDefault, TPage = unknown>(
  options: UseInfiniteQueryOptions<TData, TError, TData | undefined, TPage>,
): UseInfiniteQueryReturn<TPage, TError> {
  const queryCache = useQueryCache()
  const initialPage = toValue(options.initialPage)

  const { refetch, refresh, ...query } = useQuery<TPage, TError, TPage>({
    ...options,
    initialData: () => initialPage,
    // since we hijack the query function and augment the data, we cannot refetch the data
    // like usual
    staleTime: Infinity,
    async query(context) {
      // Get the current cached data for this specific key
      const currentPages = queryCache.getQueryData<TPage>(toValue(options.key)) ?? initialPage
      const data: TData = await options.query(currentPages, context)
      return options.merge(currentPages, data)
    },
  })

  return {
    ...query,
    loadMore: () => refetch(),
  }
}
