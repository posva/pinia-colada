# Diagnostics

Pinia Colada reports user-facing problems through stable **diagnostic codes**. Each warning or error logged in development carries a code like `PC_R0003` and a link to a dedicated page explaining what happened and how to fix it.

```txt
[PC_R0003] useQuery() was called with an empty array as the key. It must have at least one element.
├▶ fix: Provide a key with at least one element, e.g. ["todos"].
╰▶ see: https://pinia-colada.esm.dev/errors/pc_r0003
```

## How codes are structured

Codes follow the pattern `PC_XNNNN`:

- `PC` is the Pinia Colada prefix.
- The letter is the **area** the diagnostic belongs to:
  - `R` — runtime
  - `C` — config
  - `D` — deprecation
- The number is a stable identifier. Published codes are permanent: a code is never renamed or reused.

## Development vs production

Most diagnostics are **development-only**: they are guarded so they do not run in production builds. Diagnostics that are part of behavior (the ones that `throw`) keep their message in production as well, but the report-only warnings are stripped out of optimized bundles.

This means you should fix every diagnostic you see in development, even the ones that "only warn" — in production they are silent.

## Catalog

### Runtime

| Code                       | Summary                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| [`PC_R0001`](./pc_r0001)   | `useQueryCache()` called outside of an injection context          |
| [`PC_R0002`](./pc_r0002)   | The query cache was reassigned instead of mutated                 |
| [`PC_R0003`](./pc_r0003)   | `useQuery()` called with an empty array key                       |
| [`PC_R0004`](./pc_r0004)   | `entry.refresh()` / `entry.fetch()` called without options        |
| [`PC_R0005`](./pc_r0005)   | `defineMutation()` called outside of a component or effect scope  |
| [`PC_R0006`](./pc_r0006)   | `useMutationCache()` called outside of an injection context       |
| [`PC_R0007`](./pc_r0007)   | The mutation cache was reassigned instead of mutated              |
| [`PC_R0008`](./pc_r0008)   | A mutation entry was mutated before being ensured                 |
| [`PC_R0009`](./pc_r0009)   | A mutation entry was reused                                       |
| [`PC_R0010`](./pc_r0010)   | `loadPreviousPage()` called without `getPreviousPageParam`        |
| [`PC_R0011`](./pc_r0011)   | Infinite query entry not found in the cache                       |
| [`PC_R0012`](./pc_r0012)   | `PiniaColada` installed without a Pinia instance                  |
