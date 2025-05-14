/**
 * Key used to identify a query or a mutation. Must be a JSON serializable
 * value. Type is unknwon to avoid deep type recursion.
 */
export type EntryKey = readonly unknown[]

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
