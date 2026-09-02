import type {
  DataState,
  EntryKey,
  UseQueryEntryFilter,
  UseMutationEntryFilter,
} from '@pinia/colada'
import type { UseQueryEntryPayload } from '../query-serialized'
import type { UseMutationEntryPayload } from '../mutation-serialized'
import { toRaw } from 'vue'
import {
  isRestoredCustomValue,
  restoreClonedDeep,
  safeSerialize,
  serializeCircular,
} from './custom-values'
import { isPlainObject } from '../json'

export { isNonSerializableValue } from './custom-values'
export { restoreClonedDeep } from './custom-values'
export { restoreOriginalValues } from './custom-values'
export { trackPromise } from './custom-values'
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
  return serializeDevtoolsValueRecursive(val, new WeakSet())
}

function serializeDevtoolsValueRecursive(val: unknown, activeReferences: WeakSet<object>): unknown {
  if (val && typeof val === 'object') {
    if (activeReferences.has(val)) return serializeCircular()
    activeReferences.add(val)
  }

  let serialized: unknown
  if (Array.isArray(val)) {
    serialized = val.map((item) => serializeDevtoolsValueRecursive(item, activeReferences))
  } else if (isRestoredCustomValue(val)) {
    serialized = safeSerialize(toRaw(val))
  } else if (val && typeof val === 'object' && Object.getPrototypeOf(val) === null) {
    serialized = safeSerialize(val)
  } else if (
    isPlainObject(val) &&
    '__constructorName' in val &&
    typeof val.__constructorName === 'string'
  ) {
    serialized = safeSerialize(toRaw(val))
  } else if (isPlainObject(val)) {
    serialized = Object.fromEntries(
      Object.entries(val).map(([key, value]) => [
        key,
        serializeDevtoolsValueRecursive(value, activeReferences),
      ]),
    )
  } else {
    serialized = safeSerialize(toRaw(val))
  }

  if (val && typeof val === 'object') activeReferences.delete(val)
  return serialized
}
