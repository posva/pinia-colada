# Plugins

::: warning

The plugin system is still under development and the API is subject to change. If you want to develop a plugin, please [open a discussion](https://github.com/posva/pinia-colada/discussions) to share your progress and issues you might encounter.

:::

Plugins are install-time functions that subscribe to **Pinia Colada cache actions** allowing you to observe and modify query/mutation lifecycles globally without needing to change your components or the core library.

This behavior is based on [Pinia's `$onAction()` subscriptions](https://pinia.vuejs.org/core-concepts/actions.html#Subscribing-to-actions) and possible because Pinia Colada is built on top of Pinia stores. Under the hood, `useQuery()` and `useMutation()` are composables that trigger actions on their respective caches (`queryCache` and `mutationCache`) to perform their work.

Most plugin work falls into one of these categories:

- add extra reactive fields to `useQuery()` / `useMutation()` return values (entry **extensions**)
- add new options to queries/mutations (via TypeScript module augmentation)
- observe outcomes centrally (logging, analytics, notifications)
- coordinate timers/retries/refetch policies

::: important

Pinia Colada's core is intentionally minimal. The plugin system is designed to be powerful and flexible enough to cover a wide range of use cases, from simple extensions to complex behaviors like retries or persistence.

:::

## Conventions

Pinia Colada plugins:

- should have a clear name with `pinia-colada-plugin-` prefix.
- include `pinia-colada-plugin` keyword in package.json.

## Plugins Options

Users will install plugins to the project `dependencies` and configure them using the `plugins` array option when registering Pinia Colada:

```ts [./src/main.ts]
import { PiniaColada } from '@pinia/colada'
import PiniaColadaFeaturePlugin from 'pinia-colada-plugin-feature'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaFeaturePlugin(options),
  ],
})
```

Plugins are installed in array order. If multiple plugins hook the same cache action, they will run in installation order.

## Plugins Structure

Plugins should be factory functions that accept options and return a function that receives the [plugin context](#plugins-context).

```ts twoslash
import { type PiniaColadaPlugin, useMutationCache } from '@pinia/colada'

/**
 * Options for the Pinia Colada Feature Plugin.
 */
export interface FeaturePluginOptions {
  /**
   * Example option for the plugin.
   *
   * @default 'default value'
   */
  foo?: string
}

const FEATURE_OPTIONS_DEFAULTS = {
  foo: 'default value',
} satisfies Required<FeaturePluginOptions>

/**
 * Example plugin that observes query and mutation lifecycles.
 *
 * @param options - plugin options
 */
export function PiniaColadaFeaturePlugin(options: FeaturePluginOptions = {}): PiniaColadaPlugin {
  return ({ queryCache, pinia }) => {
    queryCache.$onAction(({ name, args }) => {
      if (name === 'setQueryData') {
        // args type gets narrowed down to the correct type
        const [queryKey, data] = args
      } else {
        // ...
      }
    })

    // Mutations are tree-shakable, so the mutation cache
    // is not part of the plugin context. Opt in explicitly.
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args }) => {
      if (name === 'mutate') {
        const [entry] = args
        void entry
      }
    })
  }
}
```


## Plugins Context

The plugin context is automatically passed to the plugin function and includes:

- `queryCache`: the [Query Cache](./query-cache.md) store (powers `useQuery()` and query utilities)
- `pinia`: the Pinia instance (use it to access other stores, like the mutation cache)
- `scope`: a Vue `EffectScope` for any reactive work your plugin creates (`ref()`, `watch()`, ...)

When using a factory function, the context is passed to the returned function:

```ts
import { type PiniaColadaPlugin } from '@pinia/colada'

export function PiniaColadaFeaturePlugin(): PiniaColadaPlugin {
  return ({ queryCache, pinia, scope }) => {
    // ...
  }
}
```

::: warning

The plugin context does not include the mutation cache by default to keep the core bundle smaller. If your plugin needs to observe mutations, import `useMutationCache()` and call it with the `pinia` instance from the context.

```ts
import { useMutationCache, type PiniaColadaPlugin } from '@pinia/colada'

export function PiniaColadaFeaturePlugin(): PiniaColadaPlugin {
  return ({ pinia }) => {
    const mutationCache = useMutationCache(pinia)
    // ...
  }
}
```

:::

## Plugins Subscriptions

Pinia Colada plugins rely on [Pinia's action subscriptions](https://pinia.vuejs.org/core-concepts/actions.html#Subscribing-to-actions).

When you subscribe to a store with `$onAction()`, Pinia gives you:

- `name`: the action name
- `args`: the action parameters
- `after(cb)`: register a callback that runs when the action completes successfully
- `onError(cb)`: register a callback that runs when the action throws/rejects

```ts
queryCache.$onAction(({ name, args, after, onError }) => {
  // before context where you can create shared variables

  if (name === 'fetch') {
    const [entry] = args
  } else if (name === 'setEntryState') {
    const [entry, state] = args
  }

  // this will trigger if the action succeeds and after it has fully run.
  // it waits for any returned promise
  after((result) => {
    console.log('Action succeeded with result:', result)
  })

  // this will trigger if the action throws or returns a promise that rejects
  onError((error) => {
    console.error('Action failed with error:', error)
  })
})
```

**Observing cache actions** is the core mechanism for plugins. You subscribe to the relevant cache (`queryCache` or `mutationCache`) and you react to the actions that are relevant for your plugin's behavior (e.g. `fetch` for query hooks, `mutate` for mutation hooks, `setEntryState` for any state change, etc).

This works because `useQuery()` and `useMutation()` are composables that **only trigger cache actions** to perform their work.

For example, `useQuery()` calls `queryCache.fetch()` to execute the query function and `queryCache.setEntryState()` to update the state. By observing these actions, plugins can hook into the lifecycle of queries and mutations without needing to modify the core logic of `useQuery()` or `useMutation()`.

## Plugins for `useQuery()`

`useQuery()` uses the query cache store under the hood, so to hook into `useQuery()`'s lifecycle, subscribe to the `queryCache` actions.

Before writing a plugin to augment or modify `useQuery()`'s behavior, it's important to understand its lifecycle:

1. `useQuery()` calls `queryCache.ensure(options, previousEntry?)` to get (or create) an entry.
2. On the first ensure, the store triggers `extend(entry)` **once** so plugins can attach extensions.
3. `queryCache.fetch(entry, options?)` executes the user's `query()` function.
4. `queryCache.setEntryState(entry, state)` is the canonical state-update choke point.
5. `queryCache.remove(entry)` removes an entry (manual or GC).

All these steps happens when using `useQuery()` and are observable via the query cache actions.

::: note

The name of the method of the cache is the name of the action to observe. For example, to observe when a query is fetched, subscribe to the `fetch` action. To observe any state change, subscribe to the `setEntryState` action.

:::

Most query plugins hook into:

- `extend(entry)` to define `entry.ext.*`
- `fetch(entry, options?)` to observe success/error of the query function
- `setEntryState(entry, state)` to observe *any* state change (including `setQueryData()`)
- `remove(entry)` to cleanup timers/resources

::: tip

`fetch()` rethrows errors. Aborted/outdated requests may not update state, but the action can still reject, your `onError()` handler might see these.

:::

### Cache Keys

The cache keys are used to identify queries in the cache. The `key` passed to queries gets serialized deterministically with `toCacheKey()`.

```ts twoslash
import { toCacheKey } from '@pinia/colada'

const key = toCacheKey(['users', 1, { type: 'friends' }])
void key
```

### Query Hooks

Pinia Colada intentionally doesn't provide per-component `onSuccess/onError/onSettled` callbacks for queries.
For global query callbacks, use `PiniaColadaQueryHooksPlugin`.

Internally, it listens to the query cache `fetch` action and wires `after()` / `onError()`.

::: tip

This plugin observes **fetches**. If you need "any data change" semantics, hook `setEntryState`.

:::

## Plugins for `useMutation()`

`useMutation()` uses the mutation cache store under the hood, so to hook into `useMutation()`'s lifecycle, subscribe to the `mutationCache` actions.

::: note

you need to opt in to the mutation cache by calling `useMutationCache(pinia)` in your plugin. This is intentional to keep the core bundle smaller for users who only need query plugins.

```ts
import { useMutationCache, type PiniaColadaPlugin } from '@pinia/colada'

export function PiniaColadaFeaturePlugin(): PiniaColadaPlugin {
  return ({ pinia }) => {
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args }) => {})
  }
}
```

:::

Before writing a plugin to augment or modify `useMutation()`'s behavior, it's important to understand its lifecycle:

1. `useMutation()` creates an initial entry via `mutationCache.create(options)`.
2. The store triggers `extend(entry)` immediately so `useMutation()` can expose extensions right away.
3. Each `mutateAsync(vars)` ensures an entry via `mutationCache.ensure(entry, vars)` and then runs `mutationCache.mutate(entry)`.
4. State updates go through `mutationCache.setEntryState(entry, state)`.

Most mutation plugins hook into:

- `extend(entry)` to define `entry.ext.*`
- `setEntryState(entry, state)` to react to success/error transitions
- `remove(entry)` for cleanup

## Plugins Patterns

### Adding options

To add new options to queries or mutations, use TypeScript module augmentation to extend `UseQueryOptions` / `UseMutationOptions` and their global counterparts.

```ts
import { type PiniaColadaPlugin } from '@pinia/colada'

export interface FeaturePluginOptions {
  myOption?: boolean
}

export function PiniaColadaFeaturePlugin(options: FeaturePluginOptions = {}): PiniaColadaPlugin {
  return () => {
    // plugin implementation
  }
}

declare module '@pinia/colada' {
  interface UseQueryOptions<TData, TError, TDataInitial> extends FeaturePluginOptions {}
  interface UseQueryOptionsGlobal extends FeaturePluginOptions {}
}
```

Then you can set global defaults for your options when creating Pinia Colada:

```ts [./src/main.ts]
import { PiniaColada } from '@pinia/colada'

app.use(PiniaColada, {
  queryOptions: {
    myOption: true,
  },
})
```

For a detailed TypeScript example, see the [Typescript section](#typescript) below.

### Adding entry extensions

Entry extensions are properties stored on `entry.ext` that become available on the objects returned by `useQuery()` and `useMutation()`.

```ts
import { type PiniaColadaPlugin } from '@pinia/colada'

export function PiniaColadaFeaturePlugin(): PiniaColadaPlugin {
  return ({ queryCache, scope }) => {
    queryCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args
        // When defining reactive extensions, make sure to create them inside `scope.run()` so they are properly disposed when the entry is removed.
        scope.run(() => {
          entry.ext.myField = shallowRef<string>('initial value') // This will be reactive and available on the query return value
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  interface UseQueryEntryExtensions<TData, TError> {
    /**
     * Example of an extension field added by the plugin.
     */
    myField: ShallowRef<string>
  }
}
```

```vue
<script setup lang="ts">
const { myField } = useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
})
</script>
```

Of course, this is also possible for mutations by hooking the mutation cache and augmenting `UseMutationEntryExtensions`.

```ts
import { useMutationCache, type PiniaColadaPlugin } from '@pinia/colada'

export function PiniaColadaFeaturePlugin(): PiniaColadaPlugin {
  return ({ pinia, scope }) => {
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args
        // When defining reactive extensions, make sure to create them inside `scope.run()` so they are properly disposed when the entry is removed.
        scope.run(() => {
          entry.ext.myField = shallowRef<string>('initial value') // This will be reactive and available on the mutation return value
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  interface UseMutationEntryExtensions<TData, TVars, TError, TContext> {
    /**
     * Example of an extension field added by the plugin.
     */
    myField: ShallowRef<string>
  }
}
```

```vue
<script setup lang="ts">
const { myField } = useMutation({
  mutation: (vars) => doSomething(vars),
})
</script>
```

You should only add new keys to `entry.ext` during the `extend` action as it is shared across all plugins. Do not assign it a completely new object.

Also, you can't add new keys to `entry.ext` later (e.g. in `fetch` or `setEntryState`). You must define all the needed keys in `extend` so they are available on the return value from the start.

::: note
The `extend` action is only triggered once per entry.
:::


### Examples

Add `dataUpdatedAt` to queries:

```ts twoslash
import type { PiniaColadaPlugin } from '@pinia/colada'
import { type ShallowRef, shallowRef } from 'vue'

/**
 * Adds a `dataUpdatedAt` property to queries that represents the last time the
 * data was updated.
 */
export function PiniaColadaDataUpdatedAtPlugin(): PiniaColadaPlugin {
  return ({ queryCache, scope }) => {
    queryCache.$onAction(({ name, args, after }) => {
      // Use the `extend` action to add custom properties
      if (name === 'extend') {
        const [entry] = args
        // All effects must be created within the scope
        scope.run(() => {
          entry.ext.dataUpdatedAt = shallowRef<number>(entry.when)
        })
      } else if (name === 'setEntryState') {
        const [entry] = args
        after(() => {
          entry.ext.dataUpdatedAt.value = entry.when
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  interface UseQueryEntryExtensions<TData, TError> {
    /**
     * Time stamp of the last time the data was updated.
     */
    dataUpdatedAt: ShallowRef<number>
  }
}
```

Then you can use `dataUpdatedAt` in your components:

```vue
<script setup lang="ts">
const { dataUpdatedAt } = useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
})
</script>
```

Another example, add `mutatedAt` to mutations:

```ts twoslash
import { type PiniaColadaPlugin, useMutationCache } from '@pinia/colada'
import { type ShallowRef, shallowRef } from 'vue'

export function PiniaColadaMutatedAtPlugin(): PiniaColadaPlugin {
  return ({ pinia, scope }) => {
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args, after }) => {
      if (name === 'extend') {
        const [entry] = args
        scope.run(() => {
          entry.ext.mutatedAt = shallowRef(0)
        })
      } else if (name === 'setEntryState') {
        const [entry, state] = args
        after(() => {
          if (state.status === 'success') {
            entry.ext.mutatedAt.value = entry.when
          }
        })
      }
    })
  }
}

declare module '@pinia/colada' {
  interface UseMutationEntryExtensions<TData, TVars, TError, TContext> {
    /**
     * Timestamp of the last successful mutation.
     */
    mutatedAt: ShallowRef<number>
  }
}
```

Then you can use `mutatedAt` in your components:

```vue
<script setup lang="ts">
const { mutatedAt } = useMutation({
  mutation: (vars) => doSomething(vars),
})
</script>
```

## TypeScript

Plugins often need to augment types (options and/or entry extensions). This is done with module augmentation.

### Adding options to queries

Augment both `UseQueryOptions` (generic) and `UseQueryOptionsGlobal` (global defaults):

```ts
export interface MyQueryPluginOptions {
  myOption?: boolean
}

declare module '@pinia/colada' {
  interface UseQueryOptions<TData, TError, TDataInitial> extends MyQueryPluginOptions {}

  interface UseQueryOptionsGlobal extends MyQueryPluginOptions {}
}
```

::: note
You must keep all the generic parameters (`TData`, `TError`, `TDataInitial`) even if you don't use them, otherwise you'll get type errors.
:::

Global options are set when creating Pinia Colada:

```ts
import { PiniaColada } from '@pinia/colada'

app.use(PiniaColada, {
  queryOptions: {
    myOption: true,
  }
})
```

### Adding extensions to queries

Augment `UseQueryEntryExtensions`:

```ts
declare module '@pinia/colada' {
  interface UseQueryEntryExtensions<TData, TError> {
    myField: string
  }
}
```

::: note
You must keep all the generic parameters (`TData`, `TError`) even if you don't use them, otherwise you'll get type errors.
:::

Then you can set `entry.ext.myField` in the plugin and it will be available on the query return value.

```vue
<script setup lang="ts">
const { myField } = useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
})
</script>
```

### Adding options to mutations

Augment both `UseMutationOptions` (generic) and `UseMutationOptionsGlobal`:

```ts
export interface MyMutationPluginOptions {
  myOption?: boolean
}

declare module '@pinia/colada' {
  interface UseMutationOptions<TData, TVars, TError, TContext> extends MyMutationPluginOptions {}
  interface UseMutationOptionsGlobal extends MyMutationPluginOptions {}
}
```

::: note
You must keep all the generic parameters (`TData`, `TVars`, `TError`, `TContext`) even if you don't use them, otherwise you'll get type errors.
:::

Global options are set when creating Pinia Colada:

```ts [./src/main.ts]
import { PiniaColada } from '@pinia/colada'

app.use(PiniaColada, {
  mutationOptions: {
    myOption: true,
  }
})
```

### Adding extensions to mutations

Augment `UseMutationEntryExtensions`:

```ts
declare module '@pinia/colada' {
  interface UseMutationEntryExtensions<TData, TVars, TError, TContext> {
    myField: string
  }
}
```

::: note
You must keep all the generic parameters (`TData`, `TVars`, `TError`, `TContext`) even if you don't use them, otherwise you'll get type errors.
:::

Then you can set `entry.ext.myField` in the plugin and it will be available on the mutation return value.

```vue
<script setup lang="ts">
const { myField } = useMutation({
  mutation: (vars) => doSomething(vars),
})
</script>
```
