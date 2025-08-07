# Plugins

::: warning

The plugin system is still under development and the API is subject to change. If you want to develop a plugin, please [open a discussion](https://github.com/posva/pinia-colada/discussions) to share your progress and issues you might encounter.

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

## TypeScript

As plugins can add properties to the types, you need to augment the types to add the new properties. This is done with module augmentation.

### Adding Options to Queries

When adding options to queries, you can augment the `UseQueryOptions` and `UseQueryOptionsGlobal` interfaces. The first one gives is generic and exposes its type params for more precise type inference, the second one is global and doesn't expose the type params.

```ts
/**
 * Options for the auto-refetch plugin.
 */
export interface PiniaColadaAutoRefetchOptions {
  /**
   * Whether to enable auto refresh by default.
   * @default false
   */
  autoRefetch?: MaybeRefOrGetter<boolean>
}

// Add types for the new option
declare module '@pinia/colada' {
  interface UseQueryOptions<TData, TError, TDataInitial> extends PiniaColadaAutoRefetchOptions {}

  interface UseQueryOptionsGlobal extends PiniaColadaAutoRefetchOptions {}
}
```

To avoid repetition, define the options in a separate interface and augment both `UseQueryOptions` and `UseQueryOptionsGlobal` in a module augmentation. Note you need to write the three type params, `TData`, `TError`, and `TDataInitial`, even if you don't use them and they must be named exactly like that.

## Examples

Here are some practical examples you can learn from.

### Adding a `dataUpdatedAt` property to queries

The `dataUpdatedAt` property indicates the timestamp of the most recent data update. There are two ways to implement this:

The most simple approach is to track timestamps locally within components by watching the query result:

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

::: info

If the same query is used across multiple components, this approach may result in each component having different `dataUpdatedAt` values, depending on their mount times and update cycles.

:::

To ensure consistency, the second approach is to use a plugin that hooks into `queryCache` actions and centrally manages the timestamp:

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
  interface UseQueryEntryExtensions<TData, TError> {
    /**
     * Time stamp of the last time the data was updated.
     */
    dataUpdatedAt: ShallowRef<number>
  }
}
```
