/**
 * The status of data.
 * - `pending`: initial state
 * - `error`: has an error
 * - `success`: has data
 */
export type DataStateStatus = 'pending' | 'error' | 'success'

/**
 * Internal base type for data state.
 */
export interface _DataState_Base<TResult, TError> {
  /**
   * The last successfully resolved data.
   */
  data: TResult

  /**
   * The last rejected error.
   */
  error: TError

  /**
   * The status of the data.
   * @see {@link DataStateStatus}
   */
  status: DataStateStatus
}

export interface DataState_Success<TResult>
  extends _DataState_Base<TResult, null> {
  status: 'success'
}

export interface DataState_Error<TResult, TError>
  extends _DataState_Base<TResult | undefined, TError> {
  status: 'error'
}

export interface DataState_Pending extends _DataState_Base<undefined, null> {
  status: 'pending'
}

/**
 * Possible states for data based on its status.
 */
export type DataState<TResult, TError> =
  | DataState_Success<TResult>
  | DataState_Error<TResult, TError>
  | DataState_Pending

/**
 * The status of an async operation tied to pinia colada e.g. queries and mutations.
 * - `idle`: not running
 * - `running`: currently running
 */
export type OperationStateStatus = 'idle' | 'running'
// TODO: ? - `paused`: waiting to be run e.g. offline, debunce/throttle, etc
