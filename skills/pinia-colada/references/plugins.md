# Plugins

## Registration

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'
import { PiniaColadaDelay } from '@pinia/colada-plugin-delay'

app.use(PiniaColada, {
  plugins: [PiniaColadaRetry(), PiniaColadaDelay()],
})
```

Plugins run in array order.

## Official Plugins

### Retry (`@pinia/colada-plugin-retry`)

Retries failed queries with configurable backoff.

```ts
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

PiniaColadaRetry({
  retry: 3, // max retries (default: 3)
  delay: 1000, // ms or (count) => ms (default: exponential)
})
```

Per-query override:

```ts
useQuery({
  ...myQuery,
  retry: 0, // disable retry for this query
  // retry: (failureCount, error) => failureCount < 5 && isRetryable(error),
})
```

Adds extensions: `isRetrying`, `retryCount`, `retryError`.

### Delay (`@pinia/colada-plugin-delay`)

Delays `asyncStatus` from becoming `'loading'` to prevent UI flicker on fast responses.

```ts
import { PiniaColadaDelay } from '@pinia/colada-plugin-delay'

PiniaColadaDelay({
  delay: 200, // ms (default: 200)
  // query: 300,       // override for queries only
  // mutations: 100,   // override for mutations only
})
```

Per-query override:

```ts
useQuery({ ...myQuery, delay: 500 })
```

Adds extension: `isDelaying`.

### Auto Refetch (`@pinia/colada-plugin-auto-refetch`)

Refetches stale queries on window focus and network reconnect.

```ts
import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

PiniaColadaAutoRefetch()
```

Per-query override:

```ts
useQuery({ ...myQuery, autoRefetch: false })
```

Requires `staleTime` to be set (queries refetch only if stale).

### Cache Persister (`@pinia/colada-plugin-cache-persister`)

Persists query cache to storage.

```ts
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'

PiniaColadaCachePersister({
  key: 'pc:cache', // storage key
  storage: localStorage, // default: localStorage
  // debounce: 1000,          // ms between writes
  // filter: (entry) => true, // filter which entries to persist
})
```

### Query Hooks (built-in)

Global callbacks for query lifecycle. No separate install needed.

```ts
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onSuccess(data, entry) {
        /* ... */
      },
      onError(error, entry) {
        // access entry.meta for custom error handling
        if (entry.meta?.errorMessage) {
          showToast(entry.meta.errorMessage)
        }
      },
      onSettled(data, error, entry) {
        /* ... */
      },
    }),
  ],
})
```

## Writing Custom Plugins

Plugin = factory function returning `PiniaColadaPlugin`:

```ts
import { type PiniaColadaPlugin, useMutationCache } from '@pinia/colada'
import { shallowRef } from 'vue'

export function PiniaColadaMyPlugin(options = {}): PiniaColadaPlugin {
  return ({ queryCache, pinia, scope }) => {
    // Subscribe to query cache actions
    queryCache.$onAction(({ name, args, after, onError }) => {
      if (name === 'extend') {
        // Add extensions (called once per entry)
        const [entry] = args
        scope.run(() => {
          entry.ext.myField = shallowRef('initial')
        })
      } else if (name === 'fetch') {
        const [entry] = args
        after(() => {
          /* query succeeded */
        })
        onError((error) => {
          /* query failed */
        })
      } else if (name === 'setEntryState') {
        const [entry, state] = args
        after(() => {
          /* state updated */
        })
      }
    })

    // Opt in to mutation cache (tree-shakable)
    const mutationCache = useMutationCache(pinia)
    mutationCache.$onAction(({ name, args }) => {
      // create, extend, ensure, mutate, setEntryState
    })
  }
}
```

### Query lifecycle

1. `ensure(options)`: get or create entry
2. `extend(entry)`: (first ensure only) plugins attach extensions
3. `fetch(entry)`: execute query function
4. `setEntryState(entry, state)`: canonical state update
5. `remove(entry)`: GC or manual removal

### Mutation lifecycle

1. `create(options)` → `extend(entry)`: on `useMutation()` call
2. `ensure(entry, vars)` → `mutate(entry)`: on each `mutateAsync()` call
3. `setEntryState(entry, state)`: state transitions

### TypeScript: module augmentation

Add options to queries:

```ts
declare module '@pinia/colada' {
  interface UseQueryOptions<TData, TError, TDataInitial> {
    myOption?: boolean
  }
  interface UseQueryOptionsGlobal {
    myOption?: boolean
  }
}
```

Add entry extensions:

```ts
declare module '@pinia/colada' {
  interface UseQueryEntryExtensions<TData, TError, TDataInitial> {
    myField: ShallowRef<string>
  }
}
```

For mutations, augment `UseMutationOptions<TData, TVars, TError, TContext>`, `UseMutationOptionsGlobal`, and `UseMutationEntryExtensions<TData, TVars, TError, TContext>`. Keep all generic params even if unused.
