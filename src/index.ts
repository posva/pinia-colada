/**
 * Pinia Colada
 * @module @pinia/colada
 */
export { defineMutation } from './define-mutation'
export {
  type _ReduceContext,
  useMutation,
  type UseMutationReturn,
} from './use-mutation'

export { defineQuery } from './define-query'
export { useQuery, type UseQueryReturn } from './use-query'

// export { type UseQueryKeyList } from './query-keys'

export type {
  _DataState_Base,
  AsyncStatus,
  DataState,
  DataState_Error,
  DataState_Pending,
  DataState_Success,
  DataStateStatus,
} from './data-state'
export { type EntryKey } from './entry-options'
export type {
  RefetchOnControl,
  UseQueryOptions,
  UseQueryOptionsGlobal,
  UseQueryOptionsWithDefaults,
} from './query-options'

export type {
  UseMutationOptions,
  // UseMutationOptionsGlobal,
} from './mutation-options'

export { PiniaColada } from './pinia-colada'
export type { PiniaColadaOptions } from './pinia-colada'

export {
  PiniaColadaQueryHooksPlugin,
  type PiniaColadaQueryHooksPluginOptions,
} from './plugins/query-hooks'

export {
  hydrateQueryCache,
  type QueryCache,
  serializeQueryCache,
  serializeTreeMap,
  useQueryCache,
  type UseQueryEntry,
  type UseQueryEntryExtensions,
  type UseQueryEntryFilter,
} from './query-store'

export { type EntryNodeKey, TreeMapNode } from './tree-map'

export { type _Awaitable, type _EmptyObject, type _MaybeArray, toCacheKey } from './utils'

export type { TypesConfig } from './types-extension'

export type { PiniaColadaPlugin, PiniaColadaPluginContext } from './plugins'

export { useInfiniteQuery, type UseInfiniteQueryOptions } from './infinite-query'
