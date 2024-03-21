import type { EntryNodeKey } from './tree-map'
import type { _ObjectFlat } from './utils'

/**
 * Key used to identify a query. Always an array.
 */
export type UseEntryKey = Array<EntryNodeKey | _ObjectFlat>
