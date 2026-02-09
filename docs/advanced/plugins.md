# Plugins

::: warning

The plugin system is still under development and the API is subject to change. If you are building a plugin, consider [opening a discussion](https://github.com/posva/pinia-colada/discussions) so we can validate the approach and keep the ecosystem consistent.

:::

Plugins are install-time functions that subscribe to **Pinia Colada cache actions**.

Most plugin work falls into one of these categories:

- add extra reactive fields to `useQuery()` / `useMutation()` return values (entry **extensions**)
- add new options to queries/mutations (via TypeScript module augmentation)
- observe outcomes centrally (logging, analytics, notifications)
- coordinate timers/retries/refetch policies

## The plugin function and its context

Plugins are registered when installing Pinia Colada:

```ts
import { PiniaColada } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [/* ... */],
})
```

It is recommended to create plugins as factory functions (accepting options) and return the plugin itself.

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
        void options.foo
        void queryKey
        void data
      }
    })

    // Mutations are tree-shakable, so the mutation cache is not part of the
    // plugin context. Opt in explicitly.
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

The plugin context contains:

- `queryCache`: the [Query Cache](query-cache.md) store (powers `useQuery()` and query utilities)
- `pinia`: the Pinia instance (use it to access other stores, like the mutation cache)
- `scope`: a Vue `EffectScope` for any reactive work your plugin creates (`ref()`, `watch()`, ...)

Plugins are installed in array order (the order you pass in `plugins: [...]`).

## `$onAction()`: what it is (and what “onAfter/onError” mean)

Pinia Colada plugins rely on **Pinia’s** action subscriptions.

When you subscribe to a store with `$onAction()`, Pinia gives you:

- `name`: the action name
- `args`: the action parameters
- `after(cb)`: register a callback that runs when the action completes successfully (this is what people usually call “onAfter”)
- `onError(cb)`: register a callback that runs when the action throws/rejects

```ts
queryCache.$onAction(({ name, args, after, onError }) => {
  // "before": runs immediately when the action is called
  if (name === 'fetch') {
    const [entry] = args
    void entry
  }

  after((result) => {
    // "after": action resolved
    void result
  })

  onError((error) => {
    // "error": action rejected
    void error
  })
})
```

This is the core mental model: **plugins observe the caches by observing cache actions**.

## How plugins connect to `useQuery()` (queries)

`useQuery()` uses the query cache store under the hood.

Simplified lifecycle:

1. `useQuery()` calls `queryCache.ensure(options, previousEntry?)` to get (or create) an entry.
2. On the first ensure, the store triggers `extend(entry)` **once** so plugins can attach extensions.
3. `queryCache.fetch(entry, options?)` executes the user’s `query()` function.
4. `queryCache.setEntryState(entry, state)` is the canonical state-update choke point.
5. `queryCache.remove(entry)` removes an entry (manual or GC).

Most query plugins hook into:

- `extend(entry)` to define `entry.ext.*`
- `fetch(entry, options?)` to observe success/error of the query function
- `setEntryState(entry, state)` to observe *any* state change (including `setQueryData()`)
- `remove(entry)` to cleanup timers/resources

::: tip

`fetch()` rethrows errors. Aborted/outdated requests may not update state, but the action can still reject — your `onError()` handler might see these.

:::

## How plugins connect to `useMutation()` (mutations)

Mutations have a separate cache store, `useMutationCache()`.

Simplified lifecycle:

1. `useMutation()` creates an initial entry via `mutationCache.create(options)`.
2. The store triggers `extend(entry)` immediately so `useMutation()` can expose extensions right away.
3. Each `mutateAsync(vars)` ensures an entry via `mutationCache.ensure(entry, vars)` and then runs `mutationCache.mutate(entry)`.
4. State updates go through `mutationCache.setEntryState(entry, state)`.

Most mutation plugins hook into:

- `extend(entry)` to define `entry.ext.*`
- `setEntryState(entry, state)` to react to success/error transitions
- `remove(entry)` for cleanup

## Entry extensions: add fields to `useQuery()` / `useMutation()` return values

Entry extensions are properties stored on `entry.ext` that become available on the objects returned by `useQuery()` and `useMutation()`.

### The rule: define extension keys during `extend`

Both `useQuery()` and `useMutation()` enumerate `entry.ext` keys **once** when creating the return object.

- ✅ Add `entry.ext.myField = ...` inside the `extend` action.
- ❌ Don’t introduce new extension keys later (they won’t appear on existing return values).

### Example: `dataUpdatedAt` for queries

```ts twoslash
import type { PiniaColadaPlugin } from '@pinia/colada'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

/**
 * Adds a `dataUpdatedAt` property to queries.
 */
export function PiniaColadaDataUpdatedAtPlugin(): PiniaColadaPlugin {
  return ({ queryCache, scope }) => {
    queryCache.$onAction(({ name, args, after }) => {
      if (name === 'extend') {
        const [entry] = args
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
  interface UseQueryEntryExtensions<TData, TError, TDataInitial> {
    /**
     * Timestamp of the last time the query data was updated.
     */
    dataUpdatedAt: ShallowRef<number>
  }
}
```

### Example: `mutatedAt` for mutations

```ts twoslash
import { type PiniaColadaPlugin, useMutationCache } from '@pinia/colada'
import { shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

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

### Example: delay plugin (`asyncStatus` + `isDelaying`)

If you want a more advanced extension, the delay plugin is a great reference:

- hooks query cache action `extend`
- creates `entry.ext.isDelaying`
- wraps `entry.asyncStatus` with a `customRef()` to delay `'loading'`

See `plugins/delay/src/delay.ts`.

## Global query hooks (onSuccess/onError/onSettled)

Pinia Colada intentionally doesn’t provide per-component `onSuccess/onError/onSettled` callbacks for queries.
For global query callbacks, use `PiniaColadaQueryHooksPlugin`.

Internally, it listens to the query cache `fetch` action and wires `after()` / `onError()`.
See `src/plugins/query-hooks.ts`.

::: tip

This plugin observes **fetches**. If you need “any data change” semantics, hook `setEntryState`.

:::

## Action/args cheat sheet (high-signal hooks)

### Query cache (`queryCache`)

- `extend(entry)` → entry ensured for the first time; define `entry.ext.*` keys here.
- `ensure(options, previousEntry?)` → `useQuery()` ensures or re-ensures an entry.
- `fetch(entry, options?)` → executes the query function.
- `setEntryState(entry, state)` → any state change (success/error/manual data set).
- `remove(entry)` → entry removed; cleanup.

### Mutation cache (`mutationCache = useMutationCache(pinia)`)

- `extend(entry)` → entry created; define `entry.ext.*` keys here.
- `mutate(entry)` → executes the mutation and rethrows on error.
- `setEntryState(entry, state)` → any state change.
- `remove(entry)` → entry removed.

## Cache Keys

The cache keys are used to identify queries in the cache. The `key` passed to queries gets serialized deterministically with `toCacheKey()`.

```ts twoslash
import { toCacheKey } from '@pinia/colada'

const key = toCacheKey(['users', 1, { type: 'friends' }])
void key
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

## Best practices & gotchas

- **Create effects inside `scope.run()`** so Vue can dispose them with the cache.
- **Don’t assume `entry.options` exists** in every phase (e.g. hydration/restore): add null checks.
- **Cleanup** any timers/scheduled work when you see `remove(entry)`.
- **Treat aborts carefully**: query `fetch()` rethrows and `onError` may see cancellations.
- **SSR**: guard browser-only APIs (`document`, `localStorage`). Keep `meta` serializable if you rely on hydration.

## Where to look next (real plugins)

- `src/plugins/query-hooks.ts` (global query onSuccess/onError/onSettled)
- `plugins/delay/src/delay.ts` (entry extensions + custom `asyncStatus`)
- `plugins/mutation-metrics/src/mutation-metrics.ts` (mutation entry extensions)
- `plugins/retry/src/retry.ts` (retry scheduling + cleanup)
- `plugins/auto-refetch/src/auto-refetch.ts` (timers + SSR guard)
- `plugins/cache-persister/src/cache-persister.ts` (persistence + hydration)
