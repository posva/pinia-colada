# Errors and Warnings Reference

Pinia Colada reports user-facing errors and warnings with stable diagnostic codes. Each code links to a page explaining what happened, how to fix it, and common causes. Codes are permanent: they are never renamed or reused.

Codes follow the pattern `PC_XNNNN` where the letter indicates the area:

- `R`: runtime
- `C`: configuration
- `B`: build
- `D`: deprecation

Most diagnostics are only reported during development and are removed from production builds.

## Runtime

| Code                             | Summary                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| [PC_R0001](./pc_r0001.md)        | `useQueryCache()`/`useMutationCache()` called outside injection context  |
| [PC_R0002](./pc_r0002.md)        | The query or mutation cache was directly set                             |
| [PC_R0003](./pc_r0003.md)        | `useQuery()` called with an empty array as the key                       |
| [PC_R0004](./pc_r0004.md)        | `entry.refresh()`/`entry.fetch()` called on an entry without options     |
| [PC_R0005](./pc_r0005.md)        | A mutation entry was mutated before being ensured                        |
| [PC_R0006](./pc_r0006.md)        | A mutation entry was reused                                              |
| [PC_R0007](./pc_r0007.md)        | `defineMutation()` called outside of a component or effect scope         |
| [PC_R0008](./pc_r0008.md)        | Loading a previous page without `getPreviousPageParam`                   |
| [PC_R0009](./pc_r0009.md)        | Cannot load more pages: query entry not found in cache                   |

## Configuration

| Code                             | Summary                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| [PC_C0001](./pc_c0001.md)        | Root pinia plugin not detected when installing `PiniaColada`             |
