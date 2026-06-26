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
      // serialize: JSON.stringify,
      // deserialize: JSON.parse,
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
- `serialize: (cache) => string` (default: `JSON.stringify`) converts the persisted cache object to a string
- `deserialize: (stored) => cache` (default: `JSON.parse`) restores the persisted cache object from a string

## Custom serialization

Use `serialize` and `deserialize` when persisted query data needs an app-specific codec, such as preserving `Date` instances:

```ts
PiniaColadaCachePersister({
  serialize: (cache) => mySerializer.stringify(cache),
  deserialize: (stored) => mySerializer.parse(stored),
})
```

The callbacks operate on the whole persisted cache object.
`PersistedQueryCache` is part of the plugin's public serializer contract and follows
Pinia Colada's semver guarantees. Custom codecs may need updates on major version changes.

## Notes

- Only successful query results are persisted.
- Garbage collection still applies: if an entry is removed, it will disappear from persisted data too.
- Serialization, deserialization, and storage failures are ignored because persisted data is treated as a best-effort cache.

## Links

- Source: https://github.com/posva/pinia-colada/tree/main/plugins/cache-persister
