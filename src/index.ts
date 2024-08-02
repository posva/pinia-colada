/**
 * @module @pinia/colada
 */
export {
  useMutation,
  type UseMutationReturn,
  type UseMutationOptions,
  type _ReduceContext,
  type _EmptyObject,
  type MutationStatus,
} from './use-mutation'
export { defineMutation } from './define-mutation'

export { useQuery, type UseQueryReturn } from './use-query'
export { defineQuery } from './define-query'

// export { type UseQueryKeyList } from './query-keys'

export { type EntryKey } from './entry-options'
export type {
  DataState,
  DataStateStatus,
  DataState_Error,
  DataState_Pending,
  DataState_Success,
  _DataState_Base,
  OperationStateStatus,
} from './data-state'
export {
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { PiniaColada } from './pinia-colada'
export type { PiniaColadaOptions } from './pinia-colada'

export {
  useQueryCache,
  serialize,
  type UseQueryEntry,
} from './query-store'

export { TreeMapNode, type EntryNodeKey } from './tree-map'

export { delayLoadingRef, type _MaybeArray, type _Awaitable } from './utils'

export type { TypesConfig } from './types-extension'

// TODO: idea of plugin that persists the cached values
export type { PiniaColadaPlugin, PiniaColadaPluginContext } from './plugins'
