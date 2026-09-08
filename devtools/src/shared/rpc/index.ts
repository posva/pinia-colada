import type {
  DataState,
  EntryKey,
  UseQueryEntryFilter,
  UseMutationEntryFilter,
} from '@pinia/colada'
import { toRaw } from 'vue'
import { isRestoredCustomValue, safeSerialize, serializeCircular } from './custom-values'
import { isPlainObject } from '../json'

export {
  isNonSerializableValue,
  onPromiseSettled,
  restoreClonedDeep,
  restoreOriginalValues,
} from './custom-values'
export type { NonSerializableValue } from './custom-values'

export type DevtoolsProcedures = {
  'queries:clear': (filters?: UseQueryEntryFilter) => void
  'queries:refetch': (entryKey: EntryKey) => void
  'queries:invalidate': (entryKey: EntryKey) => void
  'queries:reset': (entryKey: EntryKey) => void

  'queries:simulate:error': (entryKey: EntryKey) => void
  'queries:simulate:error:stop': (entryKey: EntryKey) => void
  'queries:simulate:loading': (entryKey: EntryKey) => void
  'queries:simulate:loading:stop': (entryKey: EntryKey) => void

  'queries:set:state': (entryKey: EntryKey, state: DataState<unknown, unknown, unknown>) => void

  'mutations:clear': (filters?: UseMutationEntryFilter) => void
  'mutations:remove': (id: number) => void

  'mutations:simulate:error': (id: number) => void
  'mutations:simulate:error:stop': (id: number) => void
  'mutations:simulate:loading': (id: number) => void
  'mutations:simulate:loading:stop': (id: number) => void

  'mutations:replay': (id: number) => void
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
