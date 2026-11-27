import type { UseQueryFnContext } from './query-options'

/**
 * What to do with the existing data when a streamed query is fetched again.
 *
 * - `'reset'`: remove the existing data and go back to the `pending` status.
 * The data fills again as chunks arrive.
 * - `'append'`: keep the existing data and add new chunks to it.
 * - `'replace'`: keep the existing data until the stream ends, then replace it
 * with the new data in one step.
 */
export type StreamedQueryRefetchMode = 'reset' | 'append' | 'replace'

/**
 * Context passed to {@link StreamedQueryOptions.stream}.
 */
export type StreamedQueryFnContext = UseQueryFnContext<unknown, unknown, unknown>

/**
 * Options for {@link streamedQuery} without the `reducer` and `initialValue`.
 */
export interface StreamedQueryOptionsBase<TChunk> {
  /**
   * Function that returns an `AsyncIterable` (e.g. an async generator). Each
   * chunk is added to the query data as soon as it arrives. Pass the `signal`
   * to your requests to stop the stream when the query is cancelled.
   */
  stream: (
    context: StreamedQueryFnContext,
  ) => AsyncIterable<TChunk> | Promise<AsyncIterable<TChunk>>

  /**
   * What to do with the existing data when the query is fetched again.
   *
   * @default 'reset'
   * @see {@link StreamedQueryRefetchMode}
   */
  refetchMode?: StreamedQueryRefetchMode
}

/**
 * Options for {@link streamedQuery}.
 */
export interface StreamedQueryOptions<
  TChunk,
  TData = TChunk[],
> extends StreamedQueryOptionsBase<TChunk> {
  /**
   * Merges a new chunk into the accumulated data. Must not mutate `data`.
   * Defaults to adding the chunk at the end of an array.
   */
  reducer?: (data: TData, chunk: TChunk) => TData

  /**
   * Data used before the first chunk arrives. Required with a custom
   * {@link reducer}.
   *
   * @default []
   */
  initialValue?: TData
}

/**
 * Query function returned by {@link streamedQuery}.
 */
export type StreamedQueryFn<TData> = (context: StreamedQueryFnContext) => Promise<TData>

/**
 * Creates a `query` function that consumes an `AsyncIterable`. The query
 * data updates on each chunk: `status` becomes `'success'` after the first
 * chunk and `asyncStatus` stays `'loading'` until the stream ends.
 *
 * @example
 * ```ts
 * const { data } = useQuery({
 *   key: ['chat', id],
 *   query: streamedQuery({
 *     stream: ({ signal }) => fetchChatMessages(id, { signal }),
 *   }),
 * })
 * ```
 *
 * @param options - options of the streamed query
 */
export function streamedQuery<TChunk>(
  options: StreamedQueryOptionsBase<TChunk> & { reducer?: undefined; initialValue?: TChunk[] },
): StreamedQueryFn<TChunk[]>
export function streamedQuery<TChunk, TData>(
  options: StreamedQueryOptionsBase<TChunk> & {
    reducer: (data: TData, chunk: TChunk) => TData
    initialValue: TData
  },
): StreamedQueryFn<TData>
export function streamedQuery<TChunk, TData>({
  stream,
  refetchMode = 'reset',
  reducer = (data, chunk) => [...(data as unknown[]), chunk] as TData,
  initialValue = [] as TData,
}: StreamedQueryOptions<TChunk, TData>): StreamedQueryFn<TData> {
  return async (context) => {
    const { entry, queryCache, signal } = context
    const isRefetch = entry.state.value.data !== undefined

    if (isRefetch && refetchMode === 'reset') {
      queryCache.setEntryState(entry, { status: 'pending', data: undefined, error: null })
    }

    // only 'replace' keeps the old data visible until the end
    const isReplace = isRefetch && refetchMode === 'replace'
    let result = initialValue

    for await (const chunk of await stream(context)) {
      // a newer fetch or a cancel() owns the entry now
      if (signal.aborted) break

      if (isReplace) {
        result = reducer(result, chunk)
      } else {
        // read from the entry to keep changes made with setQueryData() during the stream
        const data = entry.state.value.data as TData | undefined
        result = reducer(data === undefined ? initialValue : data, chunk)
        queryCache.setEntryState(entry, { status: 'success', data: result, error: null })
      }
    }

    return isReplace ? result : ((entry.state.value.data as TData | undefined) ?? initialValue)
  }
}
