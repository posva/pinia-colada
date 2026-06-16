# PINIA_COLADA_R0001: cache composable called outside of an injection context

- Level: warning (dev only, reported once)

## What happened

`useQueryCache()` or `useMutationCache()` was called outside of an injection context (component `setup()`, store, navigation guard). These composables rely on Vue's `inject()` under the hood, so Vue will also emit its own warning about `inject` being used incorrectly, and the wrong app context might be picked up.

## How to fix it

Only call cache composables in places where injection is available:

```ts
// ✅ inside a component setup
const queryCache = useQueryCache()

// ✅ inside a store
export const useTodosStore = defineStore('todos', () => {
  const queryCache = useQueryCache()
  // ...
})

// ✅ inside a navigation guard
router.beforeEach(() => {
  const queryCache = useQueryCache()
  // ...
})
```

If you need it elsewhere (e.g. outside of the app), pass the pinia instance explicitly: `useQueryCache(pinia)`.

See [Usage restrictions for composables](https://vuejs.org/guide/reusability/composables.html#usage-restrictions).

## Common causes

- Calling `useQueryCache()` at the top level of a module
- Calling it inside an event handler or `setTimeout` callback instead of `setup()`
- Calling it in a plain function that is not itself called from an injection context
