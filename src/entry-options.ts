import type { EntryNodeKey } from './tree-map'
import type { _ObjectFlat } from './utils'

/**
 * Key used to identify a query or a mutation. Always an array.
 */
export type EntryKey = Readonly<Array<EntryNodeKey | _ObjectFlat>>
