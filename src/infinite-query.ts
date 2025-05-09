import { toValue } from 'vue'
import type { UseQueryFnContext, UseQueryOptions } from './query-options'
import { useQuery } from './use-query'
import type { ErrorDefault } from './types-extension'

/**
 * Options for {@link useInfiniteQuery}.
 *
 * @experimental See https://github.com/posva/pinia-colada/issues/178
 */
export interface UseInfiniteQueryOptions<
  TResult,
  TError,
  TDataInitial extends TResult | undefined = TResult | undefined,
  TPages = unknown,
> extends Omit<
    UseQueryOptions<TResult, TError, TDataInitial, TPages>,
    'query' | 'initialData' | 'placeholderData'
  > {
  /**
   * The function that will be called to fetch the data. It **must** be async.
   */
  query: (pages: NoInfer<TPages>, context: UseQueryFnContext) => Promise<TResult>
  initialPage: TPages | (() => TPages)
  merge: (result: NoInfer<TPages>, current: NoInfer<TResult>) => NoInfer<TPages>
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
export function useInfiniteQuery<TResult, TError = ErrorDefault, TPage = unknown>(
  options: UseInfiniteQueryOptions<TResult, TError, TResult | undefined, TPage>,
) {
  let pages: TPage = toValue(options.initialPage)

  const { refetch, refresh, ...query } = useQuery<TPage, TError, TPage>({
    ...options,
    initialData: () => pages,
    // since we hijack the query function and augment the data, we cannot refetch the data
    // like usual
    staleTime: Infinity,
    async query(context) {
      const data: TResult = await options.query(pages, context)
      return (pages = options.merge(pages, data))
    },
  })

  return {
    ...query,
    loadMore: () => refetch(),
  }
}
