/**
 * @module @pinia/colada
 */
export {
  type _ReduceContext,
  useMutation,
  type UseMutationOptions,
  type UseMutationReturn,
} from './use-mutation'
export { defineMutation } from './define-mutation'

export { useQuery, type UseQueryReturn } from './use-query'
export { defineQuery } from './define-query'

// export { type UseQueryKeyList } from './query-keys'

export { type EntryKey } from './entry-options'
export type {
  _DataState_Base,
  AsyncStatus,
  DataState,
  DataState_Error,
  DataState_Pending,
  DataState_Success,
  DataStateStatus,
} from './data-state'
export {
  type UseQueryOptions,
  type UseQueryOptionsWithDefaults,
} from './query-options'

export { PiniaColada } from './pinia-colada'
export type { PiniaColadaOptions } from './pinia-colada'

export {
  PiniaColadaQueryHooksPlugin,
  type PiniaColadaQueryHooksPluginOptions,
} from './plugins/query-hooks'

export {
  reviveTreeMap,
  serialize,
  serializeTreeMap,
  useQueryCache,
  type UseQueryEntry,
} from './query-store'

export { type EntryNodeKey, TreeMapNode } from './tree-map'

export { type _Awaitable, type _EmptyObject, type _MaybeArray } from './utils'

export { delayLoadingRef } from './delay-loading'

export type { TypesConfig } from './types-extension'

export type { PiniaColadaPlugin, PiniaColadaPluginContext } from './plugins'
