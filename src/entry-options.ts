import type { EntryNodeKey } from './tree-map'
import type { _ObjectFlat } from './utils'

/**
 * Key used to identify a query or a mutation. Always an array.
 */
export type EntryKey = Readonly<Array<EntryNodeKey | _ObjectFlat>>

/**
 * Internal symbol used to tag the data type of the entry key.
 * @internal
 */
export const dataTagSymbol = Symbol('Pinia Colada dataTag')

/**
 * Same as {@link EntryKey} but with a data tag that allows inference of the data type.
 * Used by `defineQueryOptions()`.
 */
export type EntryKeyTagged<T> = EntryKey & { [dataTagSymbol]?: T }
