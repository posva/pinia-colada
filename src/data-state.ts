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

export interface DataState_Error<TResult, TError, TDataInitial>
  extends _DataState_Base<TResult | TDataInitial, TError> {
  status: 'error'
}

export interface DataState_Pending<TDataInitial> extends _DataState_Base<TDataInitial, null> {
  status: 'pending'
}

/**
 * Possible states for data based on its status.
 */
export type DataState<TResult, TError, TDataInitial = undefined> =
  | DataState_Success<TResult>
  | DataState_Error<TResult, TError, TDataInitial>
  | DataState_Pending<TDataInitial>

/**
 * The status of an async operation tied to pinia colada e.g. queries and mutations.
 * - `idle`: not loading
 * - `loading`: currently loading
 */
export type AsyncStatus = 'idle' | 'loading'
// TODO: ? - `paused`: waiting to be run e.g. offline, debounce/throttle, etc
