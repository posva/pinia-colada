/**
 * Pinia Colada
 * @module @pinia/colada
 */

export type {
  AsyncStatus,
  DataState,
  DataState_Error,
  DataState_Pending,
  DataState_Success,
  DataStateStatus,
} from './data-state'

export type { EntryKey, EntryKeyTagged, toCacheKey } from './entry-keys'

export { defineQueryOptions } from './define-query-options'

export type {
  RefetchOnControl,
  UseQueryOptions,
  UseQueryOptionsGlobal,
  UseQueryOptionsWithDefaults,
} from './query-options'

export { defineQuery } from './define-query'
export { useQuery, type UseQueryReturn } from './use-query'

export {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryReturn,
} from './infinite-query'

export {
  hydrateQueryCache,
  type QueryCache,
  serializeQueryCache,
  useQueryCache,
  type UseQueryEntry,
  type UseQueryEntryExtensions,
  type UseQueryEntryFilter,
} from './query-store'

export type {
  UseMutationOptions,
  UseMutationOptionsGlobal,
  UseMutationOptionsGlobalDefaults,
} from './mutation-options'

export { defineMutation } from './define-mutation'
export type { UseMutationReturn } from './use-mutation'
export { useMutation } from './use-mutation'

export { PiniaColada } from './pinia-colada'
export type { PiniaColadaOptions } from './pinia-colada'

export {
  PiniaColadaQueryHooksPlugin,
  type PiniaColadaQueryHooksPluginOptions,
} from './plugins/query-hooks'

export type { TypesConfig } from './types-extension'

export type { PiniaColadaPlugin, PiniaColadaPluginContext } from './plugins'

// internals
export type {
  DATA_TAG as _DATA_TAG,
  JSONArray as _JSONArray,
  JSONObject as _JSONObject,
  JSONPrimitive as _JSONPrimitive,
  JSONValue as _JSONValue,
} from './entry-keys'

export { type _Awaitable, type _EmptyObject, type _MaybeArray } from './utils'

export type { _ReduceContext } from './use-mutation'

export type { _DataState_Base } from './data-state'
