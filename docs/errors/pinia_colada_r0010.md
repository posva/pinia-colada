# PINIA_COLADA_R0010: removing an active query entry

- Level: warning (dev only)

## What happened

`queryCache.remove(entry)` was called while a component or effect scope still uses the entry. Removing an active entry is unsupported. Its consumers can keep references to an entry that is no longer in the cache, which can cause unexpected behavior.

## How to fix it

Wait until all consumers stop using the entry before removing it. If you need to refresh an active query, invalidate it instead:

```ts
await queryCache.invalidateQueries({ key: entry.key, exact: true })
```

## Common causes

- Clearing the cache while a component that uses the query is still mounted
- Removing an entry from a query cache plugin while it still has consumers
