# PINIA_COLADA_R0009: query entry not found in cache

- Level: warning (dev only)

## What happened

`loadNextPage()` or `loadPreviousPage()` was called but the corresponding query entry could not be found in the cache. The call is ignored and resolves to `null`. This usually means the infinite query has not run yet or its entry was removed from the cache.

## How to fix it

Make sure the infinite query is active (e.g. used by a mounted component) before loading more pages:

```ts
const { state, loadNextPage } = useInfiniteQuery({
  key: ['items'],
  query: ({ pageParam }) => fetchItems(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextPage,
})

// ❌ the entry could be removed from the cache before this runs
onUnmounted(() => {
  setTimeout(() => {
    loadNextPage()
  }, 1000)
})
```

## Common causes

- The entry was garbage collected (e.g. after `gcTime`) or removed from the cache while a component still holds a reference to `loadNextPage()`
- A dynamic `key` that changed, so the entry for the new key does not exist yet (race condition)
