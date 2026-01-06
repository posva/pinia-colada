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

| Option     | Type                            | Default                | Description                           |
| ---------- | ------------------------------- | ---------------------- | ------------------------------------- |
| `key`      | `string`                        | `'pinia-colada-cache'` | Storage key used to persist the cache |
| `storage`  | `Storage \| PiniaColadaStorage` | `localStorage`         | Storage backend (sync or async)       |
| `filter`   | `UseQueryEntryFilter`           | -                      | Filter which queries to persist       |
| `debounce` | `number`                        | `1000`                 | Debounce time in ms before persisting |
