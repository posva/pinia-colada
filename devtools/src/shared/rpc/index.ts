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
  serializeReference,
  serializeReferencedValue,
} from './custom-values'
import { isPlainObject, VALUE_REFERENCE } from '../json'

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
  const referenceCounts = new WeakMap<object, number>()
  const referenceIds = new WeakMap<object, number>()
  const lastReferenceId = { value: collectReferences(val, referenceCounts, new WeakSet()) }
  return serializeDevtoolsValueRecursive(
    val,
    referenceCounts,
    referenceIds,
    new WeakSet(),
    lastReferenceId,
  )
}

function serializeDevtoolsValueRecursive(
  val: unknown,
  referenceCounts: WeakMap<object, number>,
  referenceIds: WeakMap<object, number>,
  activeReferences: WeakSet<object>,
  lastReferenceId: { value: number },
): unknown {
  let referenceId: number | undefined
  if (val && typeof val === 'object') {
    const restoredReferenceId = (val as Record<PropertyKey, unknown>)[VALUE_REFERENCE]
    referenceId =
      referenceIds.get(val) ??
      (typeof restoredReferenceId === 'number' ? restoredReferenceId : undefined)
    if (activeReferences.has(val)) {
      return serializeReference(referenceId ?? ++lastReferenceId.value)
    }
    if ((referenceCounts.get(val) ?? 0) > 1 || referenceId != null) {
      referenceId ??= ++lastReferenceId.value
      referenceIds.set(val, referenceId)
    }
    activeReferences.add(val)
  }

  let serialized: unknown
  if (Array.isArray(val)) {
    serialized = val.map((item) =>
      serializeDevtoolsValueRecursive(
        item,
        referenceCounts,
        referenceIds,
        activeReferences,
        lastReferenceId,
      ),
    )
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
        serializeDevtoolsValueRecursive(
          value,
          referenceCounts,
          referenceIds,
          activeReferences,
          lastReferenceId,
        ),
      ]),
    )
  } else {
    serialized = safeSerialize(toRaw(val))
  }

  if (val && typeof val === 'object') activeReferences.delete(val)
  return referenceId == null ? serialized : serializeReferencedValue(referenceId, serialized)
}

function collectReferences(
  val: unknown,
  referenceCounts: WeakMap<object, number>,
  visited: WeakSet<object>,
): number {
  if (!val || typeof val !== 'object') return 0

  referenceCounts.set(val, (referenceCounts.get(val) ?? 0) + 1)
  const existingId = (val as Record<PropertyKey, unknown>)[VALUE_REFERENCE]
  let largestReferenceId = typeof existingId === 'number' ? existingId : 0
  if (visited.has(val)) return largestReferenceId
  visited.add(val)

  const children = Array.isArray(val) ? val : isPlainObject(val) ? Object.values(val) : []
  for (const child of children) {
    largestReferenceId = Math.max(
      largestReferenceId,
      collectReferences(child, referenceCounts, visited),
    )
  }
  return largestReferenceId
}
