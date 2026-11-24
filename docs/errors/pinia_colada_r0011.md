# PINIA_COLADA_R0011: defineQuery() called inside another defineQuery()

- Level: warning (dev only)

## What happened

A composable returned by `defineQuery()` was called inside the setup function of another `defineQuery()`. Nesting defined queries is not supported. The outer query may never become active again after all its consumers are unmounted, and the inner queries may never become inactive.

## How to fix it

Share the query options with `defineQueryOptions()` and call `useQuery()` in each `defineQuery()`:

```ts
const todoListQuery = defineQueryOptions({
  key: ['todos'],
  query: () => fetchTodos(),
})

const useTodoList = defineQuery(() => useQuery(todoListQuery))

// ❌ calls a defineQuery() composable inside another defineQuery()
const useTodoCount = defineQuery(() => {
  const { data } = useTodoList()
  return computed(() => data.value?.length ?? 0)
})

// ✅ calls useQuery() with the shared options, so both queries share the same cache entry
const useTodoCount = defineQuery(() => {
  const { data } = useQuery(todoListQuery)
  return computed(() => data.value?.length ?? 0)
})
```

## Common causes

- Reusing a defined query inside another one to share its data
- Using a `defineQuery()` only to share a ref between queries: move the ref out of the `defineQuery()` instead (e.g. to a Pinia store)
