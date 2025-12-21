import { computed, ref, toValue, type Ref } from 'vue'
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
   * Maximum number of pages to keep in the cache. Old pages will be removed
   * from the cache when new pages are added. If not set, all pages will
   * be kept.
   */
  maxPages?: number

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

  /**
   * Function to get the previous page parameter based on the first page and
   * all pages fetched so far. If it returns `undefined` or `null`, it will
   * consider there are no more pages to fetch.
   */
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
  /**
   * Whether there is a next page to load. Defined based on the result of
   * {@link UseInfiniteQueryOptions.getNextPageParam}.
   */
  hasNextPage: Ref<boolean>

  /**
   * Load the next page of data.
   */
  loadNextPage: () => Promise<unknown>

  /**
   * Whether there is a previous page to load. Defined based on the result of
   * {@link UseInfiniteQueryOptions.getPreviousPageParam}.
   */
  hasPreviousPage: Ref<boolean>

  /**
   * Load the previous page of data.
   * Requires {@link UseInfiniteQueryOptions.getPreviousPageParam} to be defined.
   */
  loadPreviousPage: () => Promise<unknown>
}

/**
 * Indicator for which page to load next. 0 means refetch all pages, 1 means
 * next page, -1 means previous page.
 *
 * @internal
 */
type NextPageIndicator = 0 | 1 | -1

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
  // we start by assuming we want to load the next page
  let nextPage: NextPageIndicator = 0
  // initially, we don't know if there is a next or previous page
  // this must be computed based on the entry
  const nextPageParam = ref<TPageParam | null | undefined>()
  const hasNextPage = computed(() => nextPageParam.value != null)
  const previousPageParam = ref<TPageParam | null | undefined>()
  const hasPreviousPage = computed(() => previousPageParam.value != null)

  const query = useQuery<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>(() => {
    const opts = toValue(options)
    // TODO: compute initial values for hasNextPage and hasPreviousPage based on initialData
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

        const firstPage = pages.at(0)
        const firstPageParam = pageParams.at(0)
        const lastPage = pages.at(-1)
        const lastPageParam = pageParams.at(-1)

        nextPageParam.value =
          lastPage && lastPageParam != null
            ? opts.getNextPageParam(lastPage, pages, lastPageParam, pageParams)
            : null

        previousPageParam.value =
          firstPage && firstPageParam != null
            ? opts.getPreviousPageParam?.(firstPage, pages, firstPageParam, pageParams)
            : null

        // if we never loaded, consider we want to load the first page
        if (entry.state.value.status === 'pending' && nextPage === 0) {
          nextPage = 1
        }

        if (nextPage === 0) {
          // TODO: refetch all pages
          console.warn('not implemented: refetch all pages in infinite query')
          throw new Error('not implemented: refetch all pages in infinite query')
        }

        const position = nextPage > 0 ? -1 : 0
        nextPage = 0
        if (process.env.NODE_ENV !== 'production') {
          if (position === 0 && !opts.getPreviousPageParam) {
            const msg =
              '[useInfiniteQuery] Trying to load previous page but `getPreviousPageParam` is not defined in options. This will fail in production.'
            console.warn(msg)
            throw new Error(msg)
          }
        }

        const pageParam =
          (position ? nextPageParam : previousPageParam).value ?? toValue(opts.initialPageParam)

        const data = await opts.query({
          ...context,
          pageParam,
        })

        const arrayMethod = position ? 'push' : 'unshift'
        pages[arrayMethod](data)
        pageParams[arrayMethod](pageParam)

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

  async function loadPage(page: NextPageIndicator): Promise<unknown> {
    const opts = toValue(options)
    const entry = queryCache.get(toValue(opts.key))
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useInfiniteQuery] Cannot load next page: query entry not found in cache.')
      }
      return null
    }
    nextPage = page
    return queryCache.fetch(entry)
  }

  return {
    ...query,
    hasNextPage,
    loadNextPage: () => loadPage(1),
    hasPreviousPage,
    loadPreviousPage: () => loadPage(-1),
  }
}
