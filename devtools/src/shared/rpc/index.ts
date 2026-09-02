import type {
  DataState,
  EntryKey,
  UseQueryEntryFilter,
  UseMutationEntryFilter,
} from '@pinia/colada'
import type { UseQueryEntryPayload } from '../query-serialized'
import type { UseMutationEntryPayload } from '../mutation-serialized'
import { toRaw } from 'vue'
import { restoreClonedDeep, safeSerialize } from './custom-values'
import { isPlainObject } from '../json'

export { isNonSerializableValue } from './custom-values'
export { restoreClonedDeep } from './custom-values'
export type { NonSerializableValue } from './custom-values'

export interface AppEmits {
  'queries:all': [entries: UseQueryEntryPayload[]]
  'queries:update': [entry: UseQueryEntryPayload]
  'queries:delete': [entry: UseQueryEntryPayload]
  'mutations:all': [entries: UseMutationEntryPayload[]]
  'mutations:update': [entry: UseMutationEntryPayload]
  'mutations:delete': [entry: UseMutationEntryPayload]
}

export interface DevtoolsEmits {
  'queries:clear': [] | [filters: UseQueryEntryFilter]
  'queries:refetch': [entryKey: EntryKey]
  'queries:invalidate': [entryKey: EntryKey]
  'queries:reset': [entryKey: EntryKey]

  'queries:simulate:error': [entryKey: EntryKey]
  'queries:simulate:error:stop': [entryKey: EntryKey]
  'queries:simulate:loading': [entryKey: EntryKey]
  'queries:simulate:loading:stop': [entryKey: EntryKey]

  'queries:set:state': [entryKey: EntryKey, state: DataState<unknown, unknown, unknown>]

  'mutations:clear': [] | [filters: UseMutationEntryFilter]
  'mutations:remove': [id: number]

  'mutations:simulate:error': [id: number]
  'mutations:simulate:error:stop': [id: number]
  'mutations:simulate:loading': [id: number]
  'mutations:simulate:loading:stop': [id: number]

  'mutations:replay': [id: number]
}

export function serializeDevtoolsValue<T>(val: T): T
export function serializeDevtoolsValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => serializeDevtoolsValue(item))
  }
  if (val && typeof val === 'object' && Object.getPrototypeOf(val) === null) {
    return safeSerialize(val)
  }
  // TODO: custom classes?
  if (isPlainObject(val)) {
    return Object.fromEntries(
      Object.entries(val).map(([key, value]) => [key, serializeDevtoolsValue(value)]),
    )
  }
  return safeSerialize(toRaw(val))
}
