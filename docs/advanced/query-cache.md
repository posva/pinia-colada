# Query Cache

The query cache is a central piece of the Pinia colada library. It centralizes the caching logic of queries and is used for [query invalidation](/guide/query-invalidation.md) and [optimistic updates](/guide/optimistic-updates.md). It's implemented as a Pinia store. It can be accessed in components setup and other _injectable contexts_ (e.g. Pinia stores, Router navigation guards) with `useQueryCache()`.

```vue twoslash
<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
</script>
```

## Two flavors of actions

The cache exposes two kinds of actions, intentionally:

- **Precise actions** take an **entry** and do exactly one thing. They are minimal and composable, letting you build the exact behavior you need: `cancel(entry)`, `remove(entry)`, `invalidate(entry)`, `fetch(entry)`, `refresh(entry)`, `setEntryState(entry, state)`.
- **Convenience actions** take a **key** or **filters** and batch over matching entries. They cover the common cases without forcing you to look up entries first: `invalidateQueries(filters)`, `cancelQueries(filters)`, `setQueriesData(filters, updater)`, `getQueryData(key)`, `setQueryData(key, data)`.

To go from a key or filters to entries (so you can call precise actions), use `get(key)` and `getEntries(filters)`. `ensure(options)` also returns an entry, useful when you want to interact with a query that might not exist yet.

As a rule of thumb, reach for a `*Queries` action first; drop down to precise actions when you need control the convenience version doesn't give you.

## Reading the cache: `get()` and `getEntries()`

These are the foundations. They don't mutate and they don't subscribe; they return a snapshot of the cache at the time of the call. You can use them anywhere `useQueryCache()` is available.

- `get(key)` returns the entry for that key, or `undefined`. Use it when you have an exact key.
- `getEntries(filters?)` returns every entry matching the filters. With no argument, it returns every entry in the cache.

Filters accept the following options:

- `key`: a key prefix. Matches the key and its children.
- `exact: true`: restrict to the exact key, excluding children. Requires `key`.
- `active: true | false | null`: only entries currently in use by a component (or not).
- `stale: true | false | null`: only stale (or fresh) entries.
- `status: 'pending' | 'success' | 'error' | null`: only entries with the given status.
- `predicate: (entry) => boolean`: custom logic, runs after the other filters match.

```ts
// every stale entry under ['todos']
const stale = queryCache.getEntries({ key: ['todos'], stale: true })
```

## Combining actions

Some workflows have no single convenience method because they combine concerns intentionally. The most common one is **clearing the cache**: `remove()` doesn't cancel pending requests, so a pending fetch can still resolve and rewrite state after you remove the entry. Clearing the cache is two steps:

```ts
// abort pending requests first, then drop the entries no component uses
queryCache.cancelQueries({ active: false })
queryCache.getEntries({ active: false }).forEach((entry) => queryCache.remove(entry))
```

Only remove entries that no component uses. Components that use an entry keep a reference to it, even after it is removed from the cache, so they keep showing its data. In development, `remove()` warns about this ([PINIA_COLADA_R0010](/errors/pinia_colada_r0010.md)). To refresh an active entry, invalidate it instead.

The same shape works to **clear private data on logout**. Queries like `['user', userId]` are usually only used on pages that need a logged-in user. Leave these pages first, so their entries become inactive, then remove the entries:

```ts
await router.push('/login')
const entry = queryCache.get(['user', userId])
if (entry) {
  queryCache.cancel(entry)
  queryCache.remove(entry)
}
```

Queries that stay in use after logout, e.g. in a layout, should include the user in their key. When the user changes, the key changes and the old entry becomes inactive.

## Common patterns with `*Queries` actions

For everything else, the convenience actions take a key or filters directly:

- **`invalidateQueries(filters?, refetchActive?)`**: mark matching entries stale and refetch the active ones. The everyday tool after a mutation. See [Query Invalidation](/guide/query-invalidation.md) for filter behavior and the `'all'` option.
- **`cancelQueries(filters?, reason?)`**: abort pending fetches for matching entries. Used in [Optimistic Updates](/guide/optimistic-updates.md) to stop in-flight fetches from overwriting the optimistic state.
- **`setQueriesData(filters, updater)`**: bulk-patch matching entries with an updater function. Use it when one server-side change should be reflected across many cached queries (e.g. a contact appearing in several lists). Like `setQueryData`, it forces `status: 'success'` on every match, including entries that never loaded, so filter by `status: 'success'` to only patch loaded data.
- **`getQueryData(key)` / `setQueryData(key, data | updater)`**: direct read/write of a single entry's data by key. `setQueryData` creates the entry if missing and forces `status: 'success'`.

```ts
// after creating a contact, patch every loaded list it appears in
queryCache.setQueriesData<Contact[]>(
  { key: ['contacts', 'list'], status: 'success' },
  (list = []) => [...list, newContact],
)
```

## See also

- [Query Invalidation](/guide/query-invalidation.md)
- [Optimistic Updates](/guide/optimistic-updates.md)
- [Cancelling Queries](/guide/cancelling-queries.md)
