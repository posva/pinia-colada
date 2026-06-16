# PINIA_COLADA_R0006: mutation entry reused

- Level: error (logged, dev only)

## What happened

`mutationCache.mutate()` was called with a mutation entry that already settled or that has an ongoing request. Each call of a mutation must use a fresh entry: reusing one overwrites its state and can mix up concurrent invocations.

## How to fix it

Re-ensure before every mutation call. `ensure()` takes the entry from `create()` plus the variables, and returns a fresh entry when the one you pass was already used:

```ts
const mutationCache = useMutationCache()
let entry = mutationCache.create(options)

// ✅ re-ensure before each call to get a fresh entry
entry = mutationCache.ensure(entry, vars)
mutationCache.mutate(entry)

entry = mutationCache.ensure(entry, vars)
mutationCache.mutate(entry)

// ❌ reusing the same ensured entry for a second call
entry = mutationCache.ensure(entry, vars)
mutationCache.mutate(entry)
mutationCache.mutate(entry)
```

If you are not calling `mutationCache.mutate()` manually, this is probably a bug in Pinia Colada: please open an issue on GitHub with a boiled down reproduction.

## Common causes

- Caching a mutation entry and mutating it multiple times
- Calling `mutationCache.mutate()` again before the previous call finished with the same entry
