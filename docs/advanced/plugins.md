# Plugins

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

export function PiniaColadaDebugPlugin(options: MyOptions = {}): PiniaColadaPlugin {
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

## Cache Keys

The cache keys are used to identify queries in the cache. The `key` passed to queries get serialized deterministically with the `toCacheKey()` function. You can use this function in plugins if you needed:

```ts twoslash
import { toCacheKey } from '@pinia/colada'

const key = toCacheKey(['users', 1, { type: 'friends' }])
```

## Examples

Here are some practical examples you can learn from.

### Adding a `dataUpdatedAt` property to queries

This plugin adds a `dataUpdatedAt` property to queries that represents the last time the data was updated. Most of the time this can be achieved at the component level where the query is used with a watcher:

```ts
const { data: contact } = useQuery({
  // ...
})
const dataUpdatedAt = ref<number>()
watch(
  () => contact.value,
  () => {
    dataUpdatedAt.value = Date.now()
  },
)
```

If you need to use this very often, you might as well crate a plugin:

```ts twoslash
import type { PiniaColadaPlugin } from '@pinia/colada'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

/**
 * Adds a `dataUpdatedAt` property to queries that represents the last time the
 * data was updated.
 */
export function PiniaColadaDataUpdatedAtPlugin(): PiniaColadaPlugin {
  return ({ queryCache, scope }) => {
    queryCache.$onAction(({ name, after, args }) => {
      if (name === 'create') {
        after((entry) => {
          // all effects must be created within the scope
          scope.run(() => {
            entry.ext.dataUpdatedAt = shallowRef<number>(entry.when)
          })
        })
      } else if (name === 'setEntryState') {
        const [entry] = args
        after(() => {
          entry.ext.dataUpdatedAt.value = entry.when
        })
      } else {
        // ...
      }
    })
  }
}

// Add the property to the types
declare module '@pinia/colada' {

  interface UseQueryEntryExtensions<TResult, TError> {
    /**
     * Time stamp of the last time the data was updated.
     */
    dataUpdatedAt: ShallowRef<number>
  }
}
```
