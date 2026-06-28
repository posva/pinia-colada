# Cache Persistence

Persist your query cache to storage so users don't start with empty state on page reload.

::: tip GC Time
Queries are removed from storage when they are garbage collected. Increase `gcTime` to keep data longer:

```ts
useQuery({
  key: ['users'],
  query: fetchUsers,
  gcTime: 1000 * 60 * 60 * 24, // 24 hours
})
```

:::

## Setup

Install the plugin:

```sh
npm install @pinia/colada-plugin-cache-persister
```

Add it to your app:

```ts
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'

app.use(PiniaColada, {
  plugins: [PiniaColadaCachePersister()],
})
```

## Filtering Queries

By default, all queries are persisted. Use the `filter` option to persist only specific queries:

```ts
// Persist queries starting with 'users'
PiniaColadaCachePersister({
  filter: { key: ['users'] },
})
```

Or use a predicate function for more control:

```ts
PiniaColadaCachePersister({
  filter: {
    predicate: (entry) => !entry.key.includes('sensitive'),
  },
})
```

## Custom Serialization

The plugin stores the cache with `JSON.stringify` and restores it with `JSON.parse`. JSON cannot represent values like `Date`, `Map`, or `Set`, so they come back as plain strings or objects after a reload. The `stringify` and `parse` options swap in a codec that preserves them, like [devalue](https://github.com/sveltejs/devalue), which you can pass as-is:

```ts
import { parse, stringify } from 'devalue'

PiniaColadaCachePersister({
  stringify,
  parse,
})
```

`devalue` handles `Date`, `Map`, `Set`, and friends out of the box. For your own classes, register a reducer and the matching reviver:

```ts
import { parse, stringify } from 'devalue'

PiniaColadaCachePersister({
  stringify: (cache) => stringify(cache, { Money: (v) => v instanceof Money && [v.amount, v.currency] }),
  parse: (stored) => parse(stored, { Money: ([amount, currency]) => new Money(amount, currency) }),
})
```

Persistence is best-effort: if serializing or restoring the cache throws, the plugin skips that write or read and continues with a stale or empty cache instead of crashing.

## Custom Storage

The plugin works with any storage that implements `getItem` and `setItem`. This includes async storage like IndexedDB:

```ts
import { get, set } from 'idb-keyval'

PiniaColadaCachePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
  },
})
```

If you use an async storage, ensure the cache is restored before your app mounts:

```ts
import { PiniaColadaCachePersister, isCacheReady } from '@pinia/colada-plugin-cache-persister'

async function main() {
  const app = createApp(App)
  app.use(pinia)
  app.use(PiniaColada, {
    plugins: [PiniaColadaCachePersister()],
  })

  await isCacheReady()
  app.mount('#app')
}

main()
```

## Options

| Option        | Type                            | Default                | Description                                            |
| ------------- | ------------------------------- | ---------------------- | ------------------------------------------------------ |
| `key`         | `string`                        | `'pinia-colada-cache'` | Storage key used to persist the cache                  |
| `storage`     | `Storage \| PiniaColadaStorage` | `localStorage`         | Storage backend (sync or async)                        |
| `filter`      | `UseQueryEntryFilter`           | -                      | Filter which queries to persist                        |
| `debounce`    | `number`                        | `1000`                 | Debounce time in ms before persisting                  |
| `stringify`   | `(cache) => string`             | `JSON.stringify`       | Convert the persisted cache object to a string         |
| `parse`       | `(stored) => cache`             | `JSON.parse`           | Restore the persisted cache object from a string       |
