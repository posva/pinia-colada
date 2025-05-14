import type { DataStateStatus } from './data-state'
import { isSubsetOf } from './entry-keys'
import type { EntryKey } from './entry-options'

/**
 * @deprecated this type is not used anymore, use {@link `EntryKey`} instead
 */
export type EntryNodeKey = string | number

// TODO: is this type worth it? We could just have a standalone find function used in stores

export class EntryMap<T extends { key: EntryKey | undefined }> extends Map<string, T> {
  /**
   * Finds entries that partially match the given key. If no key is provided, all entries are returned.
   */
  * find(partialKey?: EntryKey) {
    for (const entry of this.values()) {
      if (!partialKey || (entry.key && isSubsetOf(partialKey, entry.key))) {
        yield entry
      }
    }
  }
}

/**
 * Raw data of a query entry. Can be serialized from the server and used to hydrate the store.
 *
 * @internal
 */
export type _UseQueryEntryNodeValueSerialized<TData = unknown, TError = unknown> = [
  /**
   * The data returned by the query.
   */
  data: TData | undefined,

  /**
   * The error thrown by the query.
   */
  error: TError | null,

  /**
   * When was this data fetched the last time in ms
   */
  when?: number,
]

/**
 * Filter to get entries from the cache.
 *
 * @internal
 */
export interface EntryFilter<TEntry> {
  /**
   * A key to filter the entries.
   */
  key?: EntryKey // TODO: could be use EntryKeyTagged instead and type everything?

  /**
   * If `true`, it will only match the entry of the given `key`, skipping any children entries.
   *
   * @example
   * ```ts
   * { key: ['a'], exact: true }
   *  // will match ['a'] but not ['a', 'b'], while
   * { key: ['a'] }
   * // will match both
   * ```
   */
  exact?: boolean

  /**
   * If `true` or `false`, it will only return entries that match the stale status. If set to `null` or `undefined`, it matches both.
   * Requires `entry.options` to be set.
   */
  stale?: boolean | null

  /**
   * If `true` or `false`, it will only return entries that match the active status. If set to `null` or `undefined`, it matches both.
   */
  active?: boolean | null

  /**
   * If it has a non _nullish_ value, it only returns the entries with the given status.
   */
  status?: DataStateStatus | null

  /**
   * Pass a predicate to filter the entries. This will be executed for each entry matching the other filters.
   * @param entry - entry to filter
   */
  predicate?: (entry: TEntry) => boolean
}
