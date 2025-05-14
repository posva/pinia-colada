import type { EntryKey } from './entry-options'

export function toCacheKey(key: undefined): undefined
export function toCacheKey(key: EntryKey): string
export function toCacheKey(key: EntryKey | undefined): string | undefined
/**
 * Serializes the given {@link EntryKey | key} (query or mutation key) to a string.
 *
 * @param key - The key to serialize.
 *
 * @see EntryKey
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
