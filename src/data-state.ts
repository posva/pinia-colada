/**
 * The status of data.
 * - `pending`: initial state
 * - `error`: has an error
 * - `success`: has data
 */
export type DataStateStatus = 'pending' | 'error' | 'success'

/**
 * Internal base type for data state.
 * @internal
 */
export interface _DataState_Base<TData, TError> {
  /**
   * The last successfully resolved data.
   */
  data: TData

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

export interface DataState_Success<TData> extends _DataState_Base<TData, null> {
  status: 'success'
}

export interface DataState_Error<TData, TError, TDataInitial>
  extends _DataState_Base<TData | TDataInitial, TError> {
  status: 'error'
}

export interface DataState_Pending<TDataInitial> extends _DataState_Base<TDataInitial, null> {
  status: 'pending'
}

/**
 * Possible states for data based on its status.
 */
export type DataState<TData, TError, TDataInitial = undefined> =
  | DataState_Success<TData>
  | DataState_Error<TData, TError, TDataInitial>
  | DataState_Pending<TDataInitial>

/**
 * The status of an async operation tied to pinia colada e.g. queries and mutations.
 * - `idle`: not loading
 * - `loading`: currently loading
 */
export type AsyncStatus = 'idle' | 'loading'
// TODO: ? - `paused`: waiting to be run e.g. offline, debounce/throttle, etc
