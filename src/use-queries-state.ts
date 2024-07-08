import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import type { EntryKey } from './entry-options'
import type { QueryStatus } from './query-store'
import { useQueryCache } from './query-store'

interface QueryState {
    data: unknown
    error: unknown
    status: QueryStatus
}

// TODO: accept also a since key (instead of an array) as argument
// TODO: accept a ref for `keys` (to handle adding/removing entries for example)?
export function useQueriesState(keys: Array<MaybeRefOrGetter<EntryKey>>) {
  const { ensureEntry } = useQueryCache()
  return computed(() => {
  return keys.map<QueryState[]>(
    // TODO: fix TS issue
    (key) => {
        const query = ensureEntry(toValue(key))
        return {
            data: query.data.value,
            error: query.error.value,
            status: query.status.value,
            options: query.options,
        }
    },
)
  })
}
