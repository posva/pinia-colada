# Diagnostics

Pinia Colada diagnostics are stable error and warning codes printed by the library in development. Each diagnostic explains what happened, how to fix it, and links to a dedicated page.

## Runtime diagnostics

- [PC_R0001](./pc_r0001.md): Pinia Colada could not find a Pinia instance.
- [PC_R0002](./pc_r0002.md): The query cache was replaced directly.
- [PC_R0003](./pc_r0003.md): `useQuery()` received an empty key array.
- [PC_R0004](./pc_r0004.md): A query entry method was called without options.
- [PC_R0005](./pc_r0005.md): A cache composable was called outside an injection context.
- [PC_R0006](./pc_r0006.md): The mutation cache was replaced directly.
- [PC_R0007](./pc_r0007.md): A mutation entry was mutated before being ensured.
- [PC_R0008](./pc_r0008.md): A mutation entry was reused.
- [PC_R0009](./pc_r0009.md): A defined mutation composable was called outside a scope.
- [PC_R0010](./pc_r0010.md): An infinite query tried to load a previous page without `getPreviousPageParam`.
- [PC_R0011](./pc_r0011.md): An infinite query tried to load more pages after its entry was missing.

## Devtools diagnostics

- [PCD_R0001](./pcd_r0001.md): A mutation replay target was not found.
- [PCD_R0002](./pcd_r0002.md): A mutation replay target is being garbage collected.
- [PCD_R0003](./pcd_r0003.md): A required devtools element was not found.
- [PCD_R0004](./pcd_r0004.md): The devtools PiP window could not be opened.
- [PCD_R0005](./pcd_r0005.md): The devtools element was not found after waiting.
- [PCD_R0006](./pcd_r0006.md): A devtools injection was missing.
- [PCD_R0007](./pcd_r0007.md): A devtools RPC message had an invalid shape.
- [PCD_R0008](./pcd_r0008.md): A devtools RPC message could not be cloned or delivered.
- [PCD_R0009](./pcd_r0009.md): The JSON editor tried to update an empty path.
- [PCD_R0010](./pcd_r0010.md): The JSON editor path became invalid.
- [PCD_R0011](./pcd_r0011.md): The JSON editor path parent became invalid.
- [PCD_R0012](./pcd_r0012.md): The JSON editor failed to update a value.
- [PCD_R0013](./pcd_r0013.md): The JSON editor received invalid JSON.
- [PCD_R0014](./pcd_r0014.md): The JSON editor received an invalid BigInt.
- [PCD_R0015](./pcd_r0015.md): The JSON editor received an invalid number.
- [PCD_R0016](./pcd_r0016.md): A container media query element had an unsupported root node.
