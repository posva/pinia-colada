// Shared-state slots mirroring the caches. Keys are payloads keyed by
// `keyHash` (queries) / `id` (mutations). Kept loosely typed here because this
// file is loaded natively by Node (the devtools sources are bundler-only);
// browser code narrows them with the payload types from
// `@pinia/colada-devtools/shared`.
export const QUERIES_STATE_KEY = 'queries'
export const MUTATIONS_STATE_KEY = 'mutations'

export interface EntriesState {
  entries: Record<string | number, unknown>
}
