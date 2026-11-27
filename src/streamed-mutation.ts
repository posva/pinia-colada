import type { UseMutationContextCommon } from './mutation-options'

/**
 * Context passed to {@link StreamedMutationOptions.stream}.
 */
export type StreamedMutationFnContext = UseMutationContextCommon

/**
 * Options for {@link streamedMutation} without the `reducer` and `initialValue`.
 */
export interface StreamedMutationOptions_Base<TChunk, TVars> {
  /**
   * Function that returns an `AsyncIterable` (e.g. an async generator). Each
   * chunk is added to the mutation data as soon as it arrives. Pass the
   * `signal` to your requests to stop the stream when the mutation is
   * cancelled.
   */
  stream: (
    vars: TVars,
    context: StreamedMutationFnContext,
  ) => AsyncIterable<TChunk> | Promise<AsyncIterable<TChunk>>
}

/**
 * Options for {@link streamedMutation} that collect the chunks into an array.
 */
export interface StreamedMutationOptions_WithoutReducer<
  TChunk,
  TVars,
> extends StreamedMutationOptions_Base<TChunk, TVars> {
  reducer?: undefined

  /**
   * Data used before the first chunk arrives.
   *
   * @default []
   */
  initialValue?: TChunk[]
}

/**
 * Options for {@link streamedMutation} that merge the chunks with a custom
 * `reducer`.
 */
export interface StreamedMutationOptions_WithReducer<
  TChunk,
  TData,
  TVars,
> extends StreamedMutationOptions_Base<TChunk, TVars> {
  /**
   * Merges a new chunk into the accumulated data. Must not mutate `data`.
   */
  reducer: (data: TData, chunk: TChunk) => TData

  /**
   * Data used before the first chunk arrives.
   */
  initialValue: TData
}

/**
 * Options for {@link streamedMutation}.
 */
export type StreamedMutationOptions<TChunk, TData = TChunk[], TVars = void> =
  | StreamedMutationOptions_WithoutReducer<TChunk, TVars>
  | StreamedMutationOptions_WithReducer<TChunk, TData, TVars>

/**
 * Mutation function returned by {@link streamedMutation}.
 */
export type StreamedMutationFn<TData, TVars = void> = (
  vars: TVars,
  context: StreamedMutationFnContext,
) => Promise<TData>

/**
 * Creates a `mutation` function that consumes an `AsyncIterable`. The mutation
 * data updates on each chunk: `status` becomes `'success'` after the first
 * chunk and `asyncStatus` stays `'loading'` until the stream ends.
 *
 * @example
 * ```ts
 * const { mutate, data } = useMutation({
 *   mutation: streamedMutation({
 *     stream: (file: File) => importContacts(file),
 *   }),
 * })
 * ```
 *
 * @param options - options of the streamed mutation
 */
export function streamedMutation<TChunk, TVars = void>(
  options: StreamedMutationOptions_WithoutReducer<TChunk, TVars>,
): StreamedMutationFn<TChunk[], TVars>
export function streamedMutation<TChunk, TData, TVars = void>(
  options: StreamedMutationOptions_WithReducer<TChunk, TData, TVars>,
): StreamedMutationFn<TData, TVars>
export function streamedMutation<TChunk, TData, TVars = void>(
  options: StreamedMutationOptions<TChunk, TData, TVars>,
): StreamedMutationFn<TData | TChunk[], TVars>
export function streamedMutation<TChunk, TData, TVars>(
  options: StreamedMutationOptions_Base<TChunk, TVars> &
    Partial<StreamedMutationOptions_WithReducer<TChunk, TData, TVars>>,
): StreamedMutationFn<TData, TVars> {
  const { stream } = options
  const reducer = options.reducer ?? ((data, chunk) => [...(data as unknown[]), chunk] as TData)
  // with a custom reducer, `undefined` is a valid seed
  const initialValue = options.reducer
    ? (options.initialValue as TData)
    : (options.initialValue ?? ([] as TData))

  return async (vars, context) => {
    const { entry, mutationCache, signal } = context
    let result = initialValue

    // each mutate() call has its own entry, so there is no refetch or outdated stream
    for await (const chunk of await stream(vars, context)) {
      // the call already failed with the cancel reason
      signal.throwIfAborted()
      result = reducer(result, chunk)
      mutationCache.setEntryState(entry, { status: 'success', data: result, error: null })
    }

    return result
  }
}
