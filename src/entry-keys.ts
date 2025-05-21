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
    key
    && JSON.stringify(key, (_, val) =>
      !val || typeof val !== 'object' || Array.isArray(val)
        ? val
        : Object.keys(val)
            .sort()
            .reduce((result, key) => {
              result[key] = val[key]
              return result
            }, {} as any))
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
 * @internal
 */
export type JSONPrimitive = string | number | boolean | null

/**
 * Used for keys
 * @internal
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray

/**
 * Used for keys. Interface to avoid deep recursion.
 * @internal
 */
export interface JSONObject {
  readonly [key: string]: JSONValue | undefined
}

/**
 * Used for keys. Interface to avoid deep recursion.
 * @internal
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * Key used to identify a query or a mutation. Must be a JSON serializable
 * value. Type is unknwon to avoid deep type recursion.
 */
export type EntryKey = readonly JSONValue[]
// export type EntryKey = readonly (unknown)[]

/**
 * Internal symbol used to tag the data type of the entry key.
 * @internal
 */
export const DATA_TAG = Symbol('Pinia Colada dataTag')
/**
 * Same as {@link EntryKey} but with a data tag that allows inference of the data type.
 * Used by `defineQueryOptions()`.
 */

export type EntryKeyTagged<T> = EntryKey & { [DATA_TAG]?: T }

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
  map: Map<string, T>,
  partialKey?: EntryKey,
) {
  for (const entry of map.values()) {
    if (!partialKey || (entry.key && isSubsetOf(partialKey, entry.key))) {
      yield entry
    }
  }
}
