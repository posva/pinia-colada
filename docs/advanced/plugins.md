## Plugins

::: warning

The plugin system is still under development and the API is subject to change. If you want to develop a plugin, please [open a discussion](https://github.com/posva/pinia/discussions) to share your progress and issues you might encounter.

:::

Plugins will likely have to interact with the [Query Cache](query-cache.md), more specifically, listen to actions with `$onAction()`:

It is recommended to create plugins as functions to accept any options and return the plugin itself. This way, you can pass options to the plugin when creating it.

```ts twoslash
import type { PiniaColadaPlugin } from '@pinia/colada'

interface MyOptions {
  foo?: string
}

export function PiniaColadaDebugPlugin(
  options: MyOptions = {},
): PiniaColadaPlugin {
  return ({ queryCache, pinia }) => {
    queryCache.$onAction(({ name, args }) => {
      if (name === 'setQueryData') {
        // args type gets narrowed down to the correct type
        const [queryKey, data] = args
      } else {
        // ...
      }
    })
  }
}
```
