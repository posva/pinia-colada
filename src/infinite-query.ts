import { computed, type EffectScope, shallowRef, toValue, type ShallowRef } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { UseQueryReturn } from './use-query'
import type { ErrorDefault } from './types-extension'
import { useQueryCache, type QueryCache, type UseQueryEntry } from './query-store'
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
  hasNextPage: ShallowRef<boolean>

  /**
   * Load the next page of data.
   */
  loadNextPage: (options?: UseInfiniteQueryLoadMoreOptions) => Promise<unknown>

  /**
   * Whether there is a previous page to load. Defined based on the result of
   * {@link UseInfiniteQueryOptions.getPreviousPageParam}.
   */
  hasPreviousPage: ShallowRef<boolean>

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
 * Extensions added to the query entry for infinite queries. These are used to
 * store the next and previous page parameters and whether there are next or
 * previous pages. They are created in the cache when the entry is created and
 * updated when the query is fetched.
 */
type UseInfiniteQueryExtensions<TPageParam> = Pick<
  UseInfiniteQueryReturn,
  'hasNextPage' | 'hasPreviousPage'
> & {
  /**
   * The next page parameter, computed based on the last page and all pages fetched
   *
   * @internal
   */
  nextPageParam: ShallowRef<TPageParam | null | undefined>

  /**
   * The previous page parameter, computed based on the first page and all pages fetched
   *
   * @internal
   */
  previousPageParam: ShallowRef<TPageParam | null | undefined>
}

/**
 * Type guard to check if a query entry is an infinite query entry.
 *
 * @param entry - The query entry to check.
 *
 * @internal
 */
function isInfiniteQueryEntry(
  entry: UseQueryEntry<unknown, unknown, unknown>,
): entry is UseQueryEntry<UseInfiniteQueryData<unknown, unknown>, unknown, any> & {
  ext: UseInfiniteQueryExtensions<unknown>
} {
  return !!entry.meta.__i
}

const installedMap = new WeakMap()
function PiniaColadaInfiniteQueryPlugin(scope: EffectScope, queryCache: QueryCache) {
  if (!installedMap.has(queryCache)) {
    queryCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args
        if (isInfiniteQueryEntry(entry)) {
          scope.run(() => {
            const nextPageParam = shallowRef<unknown | null | undefined>()
            const hasNextPage = computed(() => nextPageParam.value != null)
            const previousPageParam = shallowRef<unknown | null | undefined>()
            const hasPreviousPage = computed(() => previousPageParam.value != null)

            entry.ext.nextPageParam = nextPageParam
            entry.ext.hasNextPage = hasNextPage
            entry.ext.previousPageParam = previousPageParam
            entry.ext.hasPreviousPage = hasPreviousPage
          })
        }
      }
    })

    installedMap.set(queryCache, true)
  }
}

/**
 * Creates the extensions for an infinite query entry. These are used to store the
 * next and previous page parameters and whether there are next or previous pages.
 *
 * @param extensions - The extensions object to create.
 * @internal
 */
function createInfiniteQueryEntryExtensions(extensions: UseInfiniteQueryExtensions<unknown>): void {
  extensions.nextPageParam = shallowRef<unknown | null | undefined>()
  extensions.hasNextPage = computed(() => extensions.nextPageParam.value != null)
  extensions.previousPageParam = shallowRef<unknown | null | undefined>()
  extensions.hasPreviousPage = computed(() => extensions.previousPageParam.value != null)
}

/**
 * Store and merge paginated data into a single cache entry. Allows to handle
 * infinite scrolling.
 *
 * @param options - Options to configure the infinite query.
 *
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
  // adds hasNextPage and hasPreviousPage to the entry when it's created in the cache
  PiniaColadaInfiniteQueryPlugin(queryCache._s, queryCache)
  // we start by assuming we want to load the next page
  let nextPage: NextPageIndicator = 0

  let entry:
    | UseQueryEntry<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>
    | undefined

  const query = useQuery<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>(
    // @ts-expect-error: FIXME: mismatch with TDataInitial and undefined somewhere
    () => {
      const opts = toValue(options)
      const key = toValue(opts.key)
      entry = queryCache.get(key)
      // TODO: compute initial values for hasNextPage and hasPreviousPage based on initialData
      return {
        ...opts,
        key,
        query: async (
          context: UseQueryFnContext<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial>,
        ) => {
          const currentEntry = (entry = context.entry)
          const exts = currentEntry.ext as unknown as UseInfiniteQueryExtensions<TPageParam>
          const state = currentEntry.state.value
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

              // TODO: throw if signal is aborted?

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

            computePageParams(currentEntry, data)

            pageParam = (position ? exts.nextPageParam : exts.previousPageParam).value

            // there is nothing to load
            if (pageParam == null && data) {
              return data
            }

            pageParam ??= toValue(opts.initialPageParam)

            const page = await opts.query({
              ...context,
              pageParam,
            })

            // TODO: throw if signal is aborted?

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

          computePageParams(currentEntry, { pages, pageParams })

          return { pages, pageParams }
        },

        // other options that need to be normalized
        meta: {
          ...toValue(opts.meta),
          __i: true,
        },
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
    entry: UseQueryEntry<UseInfiniteQueryData<TData, TPageParam>, TError, TDataInitial> | undefined,
    data = entry?.state.value.data,
  ) {
    if (!entry) return
    const lastPageParam = data?.pageParams.at(-1)
    const exts = entry.ext as unknown as UseInfiniteQueryExtensions<TPageParam>
    exts.nextPageParam.value =
      data && data.pages.length > 0
        ? options.getNextPageParam(data.pages.at(-1)!, data.pages, lastPageParam!, data.pageParams)
        : null

    const firstPageParam = data?.pageParams.at(0)
    exts.previousPageParam.value =
      data && data.pages.length > 0
        ? options.getPreviousPageParam?.(
            data.pages.at(0)!,
            data.pages,
            firstPageParam!,
            data.pageParams,
          )
        : null
  }

  // if we have initial data, we need to set the next and previous page params
  computePageParams(entry)

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

  // @ts-expect-error: the query contains the missing properties
  // and it's safer to add them in a plugin because they get scoped per entry
  return {
    ...query,
    loadNextPage: (options?: UseInfiniteQueryLoadMoreOptions) => loadPage(1, options),
    loadPreviousPage: (options?: UseInfiniteQueryLoadMoreOptions) => loadPage(-1, options),
  }
}
