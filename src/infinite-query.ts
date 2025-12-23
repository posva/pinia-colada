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

export interface UseInfiniteQueryFnContext<
  TData,
  TError,
  TDataInitial extends TData | undefined = undefined,
  TPageParam = unknown,
> extends UseQueryFnContext<TData, TError, TDataInitial> {
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
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined,
> extends Omit<
  UseQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
  'query' | 'key'
> {
  key: UseQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>['key']

  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (
    // NOTE: we can't use TData in the argument because it's used from the return type
    // https://github.com/microsoft/TypeScript/issues/49618
    // https://github.com/microsoft/TypeScript/issues/47599
    context: UseInfiniteQueryFnContext<
      UseInfiniteQueryData<unknown, TPageParam>,
      TError,
      TDataInitial,
      TPageParam
    >,
  ) => Promise<TData>

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
    lastPage: NoInfer<TData>,
    allPages: NoInfer<TData>[],
    lastPageParam: NoInfer<TPageParam>,
    allPageParams: NoInfer<TPageParam>[],
  ) => NoInfer<TPageParam> | undefined | null

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

  /**
   * Whether to cancel an ongoing refetch when a new one is triggered.
   * If set to `false`, a new load will be ignored if there's already one in
   * progress.
   *
   * @default true
   */
  cancelRefetch?: boolean
}

export interface UseInfiniteQueryReturn<
  TData = unknown,
  TError = ErrorDefault,
  TPageParam = unknown,
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
> extends UseQueryReturn<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial> {
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
  TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined = undefined,
>(
  options: UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>,
): UseInfiniteQueryReturn<TData, TError, TPageParam, TDataInitial> {
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

  const query = useQuery<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>(
    // @ts-expect-error: FIXME: mismatch with TDataInitial and undefined somewhere
    () => {
      const opts = toValue(options)
      // TODO: compute initial values for hasNextPage and hasPreviousPage based on initialData
      return {
        ...opts,
        key: toValue(opts.key),
        query: async (
          context: UseQueryFnContext<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
        ) => {
          entry = context.entry
          const state = entry.state.value
          const { data } = state

          // result of pages and params
          let pages: TData[]
          let pageParams: TPageParam[]
          let pageParam: TPageParam | null | undefined

          // if we never loaded, consider we want to load the first page
          if (
            (state.status === 'pending' ||
              // edge case: data is empty, we want to fetch normally
              !data?.pages.length) &&
            !nextPage
          ) {
            nextPage = 1
          }

          const position = nextPage > 0 ? -1 : 0

          // the status was not pending so this is a manual refetch
          if (
            !nextPage &&
            // NOTE: at this point data cannot be undefined but this makes TS happy
            data
          ) {
            const pagesToRefetch = data.pages.length
            pages = []
            pageParams = []

            // there is at least one page because we check for data.pages.length
            // above, so there is at least 1 pageParam
            pageParam = data.pageParams[0]!

            for (let i = 0; i < pagesToRefetch; i++) {
              // oxlint-disable-next-line: no-await-in-loop
              const page = await opts.query({
                ...context,
                pageParam,
              })

              pages.push(page)
              pageParams.push(pageParam)

              if (i < pagesToRefetch - 1) {
                const nextParam = opts.getNextPageParam(page, pages, pageParam, pageParams)

                if (nextParam == null) {
                  break
                }
                pageParam = nextParam
              }
            }
          } else {
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

            pageParam = (position ? nextPageParam : previousPageParam).value

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
            pages = data?.pages.slice() ?? []
            pageParams = data?.pageParams.slice() ?? []

            const arrayMethod = position ? 'push' : 'unshift'
            pages[arrayMethod](page)
            pageParams[arrayMethod](pageParam)
          }

          // Apply maxPages limit
          if (opts.maxPages && pages.length > opts.maxPages) {
            if (position) {
              // Loading next pages - trim from beginning (remove oldest pages)
              pages.splice(0, pages.length - opts.maxPages)
              pageParams.splice(0, pageParams.length - opts.maxPages)
            } else {
              // Loading previous pages - trim from end (remove newest pages)
              pages.splice(opts.maxPages)
              pageParams.splice(opts.maxPages)
            }
          }

          computePageParams({ pages, pageParams })

          return { pages, pageParams }
        },

        // other options that need to be normalized
        meta: toValue(opts.meta),
        // enabled: toValue(opts.enabled),
        refetchOnMount: toValue(opts.refetchOnMount),
        refetchOnReconnect: toValue(opts.refetchOnReconnect),
        refetchOnWindowFocus: toValue(opts.refetchOnWindowFocus),
        // initialData: toValue(opts.initialData),
      }
      // satisfies DefineQueryOptions<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>
    },
  )

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
    { throwOnError, cancelRefetch = true }: UseInfiniteQueryLoadMoreOptions = {},
  ): Promise<unknown> {
    const opts = toValue(options)
    const entry = queryCache.get(toValue(opts.key))
    if (!entry) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useInfiniteQuery] Cannot load next page: query entry not found in cache.')
      }
      return null
    }

    // cancel and reuse
    if (!cancelRefetch && entry.pending) {
      return entry.pending.refreshCall
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
