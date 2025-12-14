import { toValue } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'
import { useQueryCache } from './query-store'
import type { DefineQueryOptions } from './define-query'

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

  getPreviousPageParam?: (
    firstPage: TData,
    allPages: TData[],
    firstPageParam: TPageParam,
    allPageParams: TPageParam[],
  ) => TPageParam | undefined | null

  // TODO: placeholderData should be adapted to infinite queries
  // TODO: initialData should be adapted to infinite queries
}

export interface UseInfiniteQueryReturn<
  TData = unknown,
  TError = ErrorDefault,
  TPageParam = unknown,
> extends UseQueryReturn<UseInfiniteQueryData<TData, TPageParam>, TError> {
  loadNextPage: () => Promise<unknown>

  loadPreviousPage?: () => Promise<unknown>
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
export function useInfiniteQuery<
  TData,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined =
    | UseInfiniteQueryData<TData, TPageParam>
    | undefined,
>(
  options: UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>,
): UseInfiniteQueryReturn<TData, TError, TPageParam> {
  const queryCache = useQueryCache()
  const query = useQuery<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>(() => {
    const opts = toValue(options)
    return {
      ...opts,
      key: toValue(opts.key),
      query: async (
        context: UseQueryFnContext<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
      ) => {
        const { entry } = context
        const allData = entry.state.value.data
        // we create copies to ensure the old versions are preserved
        // where they are needed (e.g. devtools)
        const pages = allData?.pages.slice() ?? []
        const pageParams = allData?.pageParams.slice() ?? []
        const lastPage = pages.at(-1)
        const lastPageParam = pageParams.at(-1)
        const pageParam =
          (lastPage && lastPageParam != null
            ? opts.getNextPageParam(lastPage, pages!, lastPageParam, pageParams!)
            : null) ?? toValue(opts.initialPageParam)

        const data = await opts.query({
          ...context,
          pageParam,
        })

        // TODO: depend on direction
        pages.push(data)
        pageParams.push(pageParam)
        return { pages, pageParams }
      },

      // other options that need to be normalized
      meta: toValue(opts.meta),
      // enabled: toValue(opts.enabled),
      refetchOnMount: toValue(opts.refetchOnMount),
      refetchOnReconnect: toValue(opts.refetchOnReconnect),
      refetchOnWindowFocus: toValue(opts.refetchOnWindowFocus),
      // initialData,
    } satisfies DefineQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>
  })

  async function loadNextPage(): Promise<unknown> {
    const opts = toValue(options)
    const entry = queryCache.get(toValue(opts.key))
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useInfiniteQuery] Cannot load next page: query entry not found in cache.')
      }
      return null
    }
    return queryCache.fetch(entry)
  }

  return {
    ...query,
    loadNextPage,
    // loadNextPage
    // loadMore: () => refetch(),
  }
}
