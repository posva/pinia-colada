# Plugins

Plugins let you extend Pinia Colada globally (retries, refetch policies, persistence, global hooks, logging…) without changing every `useQuery()` / `useMutation()` call.

A plugin is an install-time function registered when you install Pinia Colada:

```ts
import { PiniaColada } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [
    // plugin factories return a plugin function
    // Some plugins are built into `@pinia/colada`, others are separate packages.
  ],
})
```

## Using plugins

Most plugins follow the same workflow:

1. Install the package (if it’s not built-in)
2. Add it to the `plugins` array
3. Optionally configure it globally (plugin options) and/or locally (per query/mutation options)

Plugin order matters: if multiple plugins hook the same cache actions, they run in installation order.

## Official plugins

- [Query Hooks (built-in)](./official/query-hooks.md)
- [Auto refetch](./official/auto-refetch.md)
- [Retry](./official/retry.md)
- [Delay](./official/delay.md)
- [Cache persister](./official/cache-persister.md)
- [Debug](./official/debug.md)

## Community plugins

See the curated list in [Community plugins](./community.md).

## Writing plugins

If you want to create your own plugin (or understand how existing ones work), see [Writing plugins](/advanced/plugins.html).
