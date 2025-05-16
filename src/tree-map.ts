import { isSubsetOf } from './entry-keys'
import type { EntryKey } from './entry-keys'

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
