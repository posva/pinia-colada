/**
 * The status of data.
 * - `pending`: initial state
 * - `error`: has an error
 * - `success`: has data
 */
export type DataStatus = 'pending' | 'error' | 'success'

export interface DataState_Base<TResult, TError> {
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
   * @see {@link DataStatus}
   */
  status: DataStatus
}

export interface DataState_Success<TResult>
  extends DataState_Base<TResult, null> {
  status: 'success'
}

export interface DataState_Error<TResult, TError>
  extends DataState_Base<TResult | undefined, TError> {
  status: 'error'
}

export interface DataState_Pending extends DataState_Base<undefined, null> {
  status: 'pending'
}

export type DataState<TResult, TError> =
  | DataState_Success<TResult>
  | DataState_Error<TResult, TError>
  | DataState_Pending

/**
 * The status of an async operation tied to pinia colada e.g. queries and mutations.
 * - `idle`: not running
 * - `running`: currently running
 */
export type OperationStatus = 'idle' | 'running'
// TODO: ? - `paused`: waiting to be run

export type AsyncDataState<TResult, TError> = DataState<TResult, TError> & {
  /**
   * The status of the operation.
   * @see {@link OperationStatus}
   */
  operationStatus: OperationStatus
}
