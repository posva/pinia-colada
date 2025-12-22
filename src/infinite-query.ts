import { computed, ref, toValue, type Ref } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'
import { useQueryCache, type UseQueryEntry } from './query-store'
import type { DefineQueryOptions } from './define-query'
import { noop } from './utils'

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

/**
 * Options for {@link UseInfiniteQueryReturn.loadNextPage} and
 * {@link UseInfiniteQueryReturn.loadPreviousPage}.
 */
export interface UseInfiniteQueryLoadMoreOptions {
  /**
   * Whether to throw an error if the fetch fails.
   *
   * @default false
   */
  throwOnError?: boolean
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
  loadNextPage: (options?: UseInfiniteQueryLoadMoreOptions) => Promise<unknown>

  /**
   * Whether there is a previous page to load. Defined based on the result of
   * {@link UseInfiniteQueryOptions.getPreviousPageParam}.
   */
  hasPreviousPage: Ref<boolean>

  /**
   * Load the previous page of data.
   * Requires {@link UseInfiniteQueryOptions.getPreviousPageParam} to be defined.
   */
  loadPreviousPage: (options?: UseInfiniteQueryLoadMoreOptions) => Promise<unknown>
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
  let entry:
    | UseQueryEntry<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>
    | undefined

  const query = useQuery<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>(() => {
    const opts = toValue(options)
    // TODO: compute initial values for hasNextPage and hasPreviousPage based on initialData
    return {
      ...opts,
      key: toValue(opts.key),
      query: async (
        context: UseQueryFnContext<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
      ) => {
        entry = context.entry
        const data = entry.state.value.data

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

        computePageParams(data)

        let pageParam = (position ? nextPageParam : previousPageParam).value

        // there is nothing to load
        if (pageParam == null && data) {
          return data
        }

        pageParam ??= toValue(opts.initialPageParam)

        const page = await opts.query({
          ...context,
          pageParam,
        })

        // we create copies to ensure the old versions are preserved
        // where they are needed (e.g. devtools)
        const pages = data?.pages.slice() ?? []
        const pageParams = data?.pageParams.slice() ?? []

        const arrayMethod = position ? 'push' : 'unshift'
        pages[arrayMethod](page)
        pageParams[arrayMethod](pageParam)

        computePageParams({ pages, pageParams })

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

  function computePageParams(
    data:
      | UseInfiniteQueryData<TData, TPageParam>
      | Exclude<TDataInitial, undefined>
      | NonNullable<TDataInitial>
      | undefined,
  ) {
    if (data) {
      const lastPageParam = data.pageParams.at(-1)
      const firstPageParam = data.pageParams.at(0)
      nextPageParam.value =
        lastPageParam != null
          ? options.getNextPageParam(
              // data is present if lastPageParam is not null
              data.pages.at(-1)!,
              data.pages,
              lastPageParam,
              data.pageParams,
            )
          : null
      previousPageParam.value =
        firstPageParam != null
          ? options.getPreviousPageParam?.(
              // same as above
              data.pages.at(0)!,
              data.pages,
              firstPageParam,
              data.pageParams,
            )
          : null
    }
  }

  // if we have initial data, we need to set the next and previous page params
  computePageParams(entry?.state.value.data)

  async function loadPage(
    page: NextPageIndicator,
    { throwOnError }: UseInfiniteQueryLoadMoreOptions = {},
  ): Promise<unknown> {
    const opts = toValue(options)
    const entry = queryCache.get(toValue(opts.key))
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useInfiniteQuery] Cannot load next page: query entry not found in cache.')
      }
      return null
    }
    nextPage = page

    return queryCache.fetch(entry).catch(throwOnError ? undefined : noop)
  }

  return {
    ...query,
    hasNextPage,
    loadNextPage: (options?: UseInfiniteQueryLoadMoreOptions) => loadPage(1, options),
    hasPreviousPage,
    loadPreviousPage: (options?: UseInfiniteQueryLoadMoreOptions) => loadPage(-1, options),
  }
}
