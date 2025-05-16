import type { DataStateStatus } from './data-state'
import type { EntryKey } from './entry-keys'

/**
 * Base interface for {@link EntryFilter}.
 *
 * @internal
 */

export interface EntryFilter_Base<TEntry> {
  /**
   * A key to filter the entries.
   */
  key?: EntryKey // TODO: could be use EntryKeyTagged instead and type everything?

  /**
   * If `true`, it will only match the entry of the given `key`, skipping any children entries.
   * It also makes `key` required.
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
} /**
   * Filter to get exactly one entry from the cache. Requires the `key` to be set.
   *
   * @internal
   */

export interface EntryFilter_Key<TEntry> extends EntryFilter_Base<TEntry> {
  key: EntryKey
  exact: true
} /**
   * Filter to get multiple matching entries from the cache.
   *
   * @internal
   */

export interface EntryFilter_NoKey<TEntry> extends EntryFilter_Base<TEntry> {
  exact?: false
} /**
   * Base interface to filter entries from a cache.
   *
   * @internal
   */

export type EntryFilter<TEntry> = EntryFilter_NoKey<TEntry> | EntryFilter_Key<TEntry>
