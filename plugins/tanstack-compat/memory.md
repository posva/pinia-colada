# TanStack Compat Plugin Memory

## Purpose

Compatibility layer for TanStack Query Vue v5 migration. Adds familiar properties to `useQuery` and `useMutation`.

## Architecture

### Plugin Entry Point

- `PiniaColadaTanStackCompat()` returns a `PiniaColadaPlugin`
- Hooks into `queryCache.$onAction('extend')` for queries
- Hooks into `mutationCache.$onAction('create')` with `after` callback for mutations

### Key Difference: Query vs Mutation Hooks

- **Queries**: Use `extend` action (called when entry is created/accessed via `ensure`)
- **Mutations**: Use `create` action because `extend` is only called on first `mutate()` call. We need properties available immediately after `useMutation()` is called.

### Frozen Object Issue

Mutation `entry.ext` starts as frozen `START_EXT` object. Must check `Object.isFrozen(entry.ext)` and replace with new object before adding properties.

## Type Augmentation - CRITICAL

### Problem

The tsconfig at `/tsconfig.pinia-colada.json` includes `plugins/*/src/**/*`. This means type augmentation affects the core library's type checking.

If properties are declared as required:

```ts
interface UseMutationEntryExtensions<...> {
  isIdle: ComputedRef<boolean>  // Required - BREAKS core
}
```

This breaks core because `ext: {}` doesn't satisfy the interface.

### Solution

Make all augmented properties optional:

```ts
interface UseMutationEntryExtensions<...> {
  isIdle?: ComputedRef<boolean>  // Optional - CORRECT
}
```

## Properties Added

### Query Extensions (12 properties)

| Property            | Type                              | Description                            |
| ------------------- | --------------------------------- | -------------------------------------- |
| isSuccess           | ComputedRef<boolean>              | status === 'success'                   |
| isError             | ComputedRef<boolean>              | status === 'error'                     |
| isFetching          | ComputedRef<boolean>              | asyncStatus === 'loading'              |
| isRefetching        | ComputedRef<boolean>              | fetching but not initial load          |
| isLoadingError      | ComputedRef<boolean>              | error on initial load                  |
| isRefetchError      | ComputedRef<boolean>              | error on refetch (had data)            |
| isStale             | ComputedRef<boolean>              | entry.stale (reactive via state.value) |
| isFetched           | ShallowRef<boolean>               | has fetched at least once              |
| isFetchedAfterMount | ShallowRef<boolean>               | fetched after mount                    |
| dataUpdatedAt       | ShallowRef<number>                | timestamp of last data                 |
| errorUpdatedAt      | ShallowRef<number>                | timestamp of last error                |
| fetchStatus         | ComputedRef<'fetching' \| 'idle'> | TanStack-style status                  |

### Mutation Extensions (7 properties)

| Property       | Type                 | Description                   |
| -------------- | -------------------- | ----------------------------- |
| isIdle         | ComputedRef<boolean> | never called (pending + idle) |
| isPending      | ComputedRef<boolean> | in progress                   |
| isSuccess      | ComputedRef<boolean> | status === 'success'          |
| isError        | ComputedRef<boolean> | status === 'error'            |
| submittedAt    | ShallowRef<number>   | when mutation started         |
| dataUpdatedAt  | ShallowRef<number>   | timestamp of last success     |
| errorUpdatedAt | ShallowRef<number>   | timestamp of last error       |

## Known Limitations

1. **Mutation extensions not on useMutation() return** - Access via mutation cache
2. **fetchStatus: 'paused' not supported** - No network mode in pinia-colada
3. **isStale time-based updates** - Only re-evaluates on state changes, not automatically

## Files

- `src/index.ts` - Re-exports
- `src/tanstack-compat.ts` - Plugin implementation + type augmentation
- `src/tanstack-compat.spec.ts` - 15 tests
- `README.md` - Installation instructions
- `docs/tanstack-compat.md` - Full documentation
