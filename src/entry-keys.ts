import type { ErrorDefault } from './types-extension'

export function toCacheKey(key: undefined): undefined
export function toCacheKey(key: EntryKey): string
export function toCacheKey(key: EntryKey | undefined): string | undefined
/**
 * Serializes the given {@link EntryKey | key} (query or mutation key) to a string.
 *
 * @param key - The key to serialize.
 *
 * @see {@link EntryKey}
 */
export function toCacheKey(key: EntryKey | undefined): string | undefined {
  return (
    key &&
    JSON.stringify(key, (_, val) =>
      !val || typeof val !== 'object' || Array.isArray(val)
        ? val
        : Object.keys(val)
            .sort()
            .reduce((result, key) => {
              result[key] = val[key]
              return result
            }, {} as any),
    )
  )
}

/**
 * Checks whether `subsetKey` is a subset of `fullsetKey` by matching partially objects and arrays.
 *
 * @param subsetKey - subset key to check
 * @param fullsetKey - fullset key to check against
 */
export function isSubsetOf(subsetKey: EntryKey, fullsetKey: EntryKey): boolean {
  return subsetKey === fullsetKey
    ? true
    : typeof subsetKey !== typeof fullsetKey
      ? false
      : subsetKey && fullsetKey && typeof subsetKey === 'object' && typeof fullsetKey === 'object'
        ? Object.keys(subsetKey).every((key) =>
            isSubsetOf(
              // NOTE: this or making them `any` in the function signature
              subsetKey[key as unknown as number] as EntryKey,
              fullsetKey[key as unknown as number] as EntryKey,
            ),
          )
        : false
}

/**
 * Used for keys
 *
 * @internal
 */
export type JSONPrimitive = string | number | boolean | null

/**
 * Used for keys
 *
 * @internal
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray

/**
 * Used for keys. Interface to avoid deep recursion.
 *
 * @internal
 */
export type JSONObject = object
// NOTE: this doesn't allow interfaces to be assigned to it due to its index signature
// export interface JSONObject {
//   readonly [key: string]: JSONValue | undefined
// }

/**
 * Used for keys. Interface to avoid deep recursion.
 *
 * @internal
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * Key used to identify a query or a mutation. Must be a JSON serializable
 * value. Type is unknwon to avoid annoying type errors like recursive types
 * and not being able to assign an interface to it due to its index signature.
 */
export type EntryKey = readonly JSONValue[]

/**
 * Internal symbol used to tag the data type of the entry key.
 *
 * @internal
 */
export const ENTRY_DATA_TAG = Symbol('Pinia Colada data tag')

/**
 * Internal symbol used to tag the error type of the entry key.
 *
 * @internal
 */
export const ENTRY_ERROR_TAG = Symbol('Pinia Colada error tag')

/**
 * Internal symbol used to tag the data initial type of the entry key.
 *
 * @internal
 */
export const ENTRY_DATA_INITIAL_TAG = Symbol('Pinia Colada data initial tag')

/**
 * Same as {@link EntryKey} but with a data tag that allows inference of the data type.
 * Used by `defineQueryOptions()`.
 */
export type EntryKeyTagged<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> = EntryKey & {
  [ENTRY_DATA_TAG]: TData
  [ENTRY_ERROR_TAG]: TError
  [ENTRY_DATA_INITIAL_TAG]: TDataInitial
}

/**
 * Finds entries that partially match the given key. If no key is provided, all
 * entries are returned.
 *
 * @param map - The map to search in.
 * @param partialKey - The key to match against. If not provided, all entries are yield.
 *
 * @internal
 */
export function* find<T extends { key: EntryKey | undefined }>(
  map: Map<string | number, T>,
  partialKey?: EntryKey,
) {
  for (const entry of map.values()) {
    if (!partialKey || (entry.key && isSubsetOf(partialKey, entry.key))) {
      yield entry
    }
  }
}

/**
 * Empty starting object for extensions that allows to detect when to update.
 *
 * @internal
 */
export const START_EXT = {}
