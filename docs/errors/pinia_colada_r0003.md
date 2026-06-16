# PINIA_COLADA_R0003: useQuery() was called with an empty key

- Level: error (thrown, dev only)

## What happened

`useQuery()` (or another query composable) was called with an empty array as the `key`. Keys identify entries in the cache, so they must contain at least one element.

## How to fix it

Pass a key with at least one element:

```ts
// ❌ empty key
useQuery({ key: [], query: fetchTodos })

// ✅
useQuery({ key: ['todos'], query: fetchTodos })
```

## Common causes

- Computing the key from a list that happens to be empty
- A `key` getter returning `[]` while waiting for some data; return a placeholder segment instead (e.g. `['todo', id ?? 'none']`) or guard with `enabled`
