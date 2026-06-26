<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Cache Persister
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-cache-persister">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-cache-persister/latest" alt="npm package">
</a>

Persist the query cache to storage and restore it on page load.

## Installation

```sh
npm install @pinia/colada-plugin-cache-persister
```

## Usage

```ts
import { PiniaColadaCachePersister, isCacheReady } from '@pinia/colada-plugin-cache-persister'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaCachePersister({
      // Options (all optional)
      key: 'pinia-colada-cache', // Storage key
      storage: localStorage, // Storage backend
      debounce: 1000, // Persist delay in ms
      serialize: JSON.stringify, // Convert cache to a string
      deserialize: JSON.parse, // Restore cache from a string
    }),
  ],
})

// if using async storage, wait for cache to be restored before mounting the app
// (not needed with localStorage)
await isCacheReady()
app.mount('#app')
```

## GC Time

Queries are removed from storage when they are garbage collected. Increase `gcTime` to keep data longer:

```ts
useQuery({
  key: ['users'],
  query: fetchUsers,
  gcTime: 1000 * 60 * 60 * 24, // 24 hours
})
```

## Options

| Option        | Type                            | Default                | Description                        |
| ------------- | ------------------------------- | ---------------------- | ---------------------------------- |
| `key`         | `string`                        | `'pinia-colada-cache'` | Storage key                        |
| `storage`     | `Storage \| PiniaColadaStorage` | `localStorage`         | Storage backend (sync or async)    |
| `filter`      | `UseQueryEntryFilter`           | -                      | Filter which queries to persist    |
| `debounce`    | `number`                        | `1000`                 | Debounce time in ms                |
| `serialize`   | `(cache) => string`             | `JSON.stringify`       | Serializes the cache for storage   |
| `deserialize` | `(stored) => cache`             | `JSON.parse`           | Deserializes the cache from string |

## Custom Serialization

By default, the plugin uses `JSON.stringify` and `JSON.parse`. If your query data contains values that JSON cannot restore, such as `Date` instances, pass your app's serializer instead:

```ts
PiniaColadaCachePersister({
  serialize: (cache) => mySerializer.stringify(cache),
  deserialize: (stored) => mySerializer.parse(stored),
})
```

The callbacks receive the whole persisted cache object, not individual query results.
`PersistedQueryCache` is part of the plugin's public serializer contract and follows
Pinia Colada's semver guarantees. Custom codecs may need updates on major version changes.

If serialization, deserialization, or storage fails, the plugin ignores the error and continues with an empty or stale cache.

## Filtering Queries

Only persist specific queries using a filter:

```ts
PiniaColadaCachePersister({
  filter: { key: ['users'] }, // Only persist queries starting with 'users'
})
```

Or use a predicate function:

```ts
PiniaColadaCachePersister({
  filter: {
    predicate: (entry) => entry.key[0] === 'important',
  },
})
```

## Async Storage

Works with async storage backends like IndexedDB, compatible with [unstorage](https://github.com/unjs/unstorage):

```ts
import { get, set } from 'idb-keyval'

PiniaColadaCachePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
  },
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
