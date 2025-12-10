import { toValue } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'

/**
 * Structure of data stored for infinite queries.
 */
export interface UseInfiniteQueryData<TData, TPageParam> {
  /**
   * Each page of data fetched in order.
   */
  pages: TData[]

  /**
   * Each page parameter used to fetch the corresponding page in the same order.
   */
  pageParams: TPageParam[]
}

export interface UseInfiniteQueryFnContext<TPageParam> extends UseQueryFnContext {
  /**
   * The page parameter for the current fetch.
   */
  pageParam: TPageParam
}

/**
 * Options for {@link useInfiniteQuery}.
 *
 * @experimental See https://github.com/posva/pinia-colada/issues/178
 */
export interface UseInfiniteQueryOptions<
  TData,
  TError,
  TPageParam,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined =
    | UseInfiniteQueryData<TData, TPageParam>
    | undefined,
> extends Omit<
    UseQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
    'query' | 'key'
  > {
  key: UseQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>['key']

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (context: UseInfiniteQueryFnContext<NoInfer<TPageParam>>) => Promise<TData>

  /**
   * Initial page parameter or function returning it. It's passed to the query
   */
  initialPageParam: TPageParam | (() => TPageParam)

  /**
   * Function to get the next page parameter based on the last page and all
   * pages fetched so far. If it returns `undefined` or `null`, it will
   * consider there are no more pages to fetch.
   */
  getNextPageParam: (
    lastPage: TData,
    allPages: TData[],
    lastPageParam: TPageParam,
    allPageParams: TPageParam[],
  ) => TPageParam | undefined | null
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
  let pages: TPage = toValue(options.initialPage)

  const { refetch, refresh, ...query } = useQuery<TPage, TError, TPage>({
    ...options,
    initialData: () => pages,
    // since we hijack the query function and augment the data, we cannot refetch the data
    // like usual
    staleTime: Infinity,
    async query(context) {
      const data: TData = await options.query(pages, context)
      return (pages = options.merge(pages, data))
    },
  })

  return {
    ...query,
    loadMore: () => refetch(),
  }
}
