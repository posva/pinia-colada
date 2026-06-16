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
| [PINIA_COLADA_R0001](./pinia_colada_r0001.md)        | `useQueryCache()`/`useMutationCache()` called outside injection context  |
| [PINIA_COLADA_R0002](./pinia_colada_r0002.md)        | The query or mutation cache was directly set                             |
| [PINIA_COLADA_R0003](./pinia_colada_r0003.md)        | `useQuery()` called with an empty array as the key                       |
| [PINIA_COLADA_R0004](./pinia_colada_r0004.md)        | `entry.refresh()`/`entry.fetch()` called on an entry without options     |
| [PINIA_COLADA_R0005](./pinia_colada_r0005.md)        | A mutation entry was mutated before being ensured                        |
| [PINIA_COLADA_R0006](./pinia_colada_r0006.md)        | A mutation entry was reused                                              |
| [PINIA_COLADA_R0007](./pinia_colada_r0007.md)        | `defineMutation()` called outside of a component or effect scope         |
| [PINIA_COLADA_R0008](./pinia_colada_r0008.md)        | Loading a previous page without `getPreviousPageParam`                   |
| [PINIA_COLADA_R0009](./pinia_colada_r0009.md)        | Cannot load more pages: query entry not found in cache                   |

## Configuration

| Code                             | Summary                                                                  |
| -------------------------------- | ------------------------------------------------------------------------ |
| [PINIA_COLADA_C0001](./pinia_colada_c0001.md)        | Root pinia plugin not detected when installing `PiniaColada`             |
