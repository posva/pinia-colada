# Cache persister

`@pinia/colada-plugin-cache-persister` persists the query cache to storage and restores it on startup.

## Install

```bash
npm i @pinia/colada-plugin-cache-persister
```

## Enable

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaCachePersister } from '@pinia/colada-plugin-cache-persister'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaCachePersister({
      // optional
      key: 'pinia-colada-cache',
      debounce: 1000,
      // storage: localStorage,
      // filter: { key: ['todos'] },
    }),
  ],
})
```

## Async storage

If your storage is asynchronous (e.g. IndexedDB wrappers), you can wait for the cache to be ready before mounting:

```ts
import { isCacheReady } from '@pinia/colada-plugin-cache-persister'

await isCacheReady()
app.mount('#app')
```

## Configuration

You can only configure the plugin globally, not per query:

- `key: string` (default: `'pinia-colada-cache'`) is the key used in storage
- `storage: Storage` (default: `localStorage`) is the storage to use (must implement `getItem`, `setItem`, and `removeItem`)
- `debounce: number` (default: `1000`) is the debounce delay in milliseconds before writing to storage
- `filter: { key: QueryKey[] }` (default: `undefined`) is an optional filter to only persist certain queries (by key)

## Notes

- Only successful query results are persisted.
- Garbage collection still applies: if an entry is removed, it will disappear from persisted data too.

## Links

- Source: https://github.com/posva/pinia-colada/tree/main/plugins/cache-persister
