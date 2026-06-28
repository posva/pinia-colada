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
      stringify: JSON.stringify, // Convert cache to a string
      parse: JSON.parse, // Restore cache from a string
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

| Option             | Type                            | Default                | Description                     |
| ------------------ | ------------------------------- | ---------------------- | ------------------------------- |
| `key`              | `string`                        | `'pinia-colada-cache'` | Storage key                     |
| `storage`          | `Storage \| PiniaColadaStorage` | `localStorage`         | Storage backend (sync or async) |
| `filter`           | `UseQueryEntryFilter`           | -                      | Filter which queries to persist |
| `debounce`         | `number`                        | `1000`                 | Debounce time in ms             |
| `stringify`        | `(cache) => string`             | `JSON.stringify`       | Stringify the cache for storage |
| `parse`            | `(stored) => cache`             | `JSON.parse`           | Parse the cache from storage    |
| `onStringifyError` | `(error) => void`               | `console.error` (dev)  | Called when `stringify` throws  |
| `onParseError`     | `(error) => void`               | `console.error` (dev)  | Called when `parse` throws      |

## Custom Serialization

By default the plugin uses `JSON.stringify`/`JSON.parse`. To persist values JSON cannot restore (`Date`, `Map`, custom classes…), pass a codec like [devalue](https://github.com/sveltejs/devalue):

```ts
import { parse, stringify } from 'devalue'

PiniaColadaCachePersister({
  stringify,
  parse,
})
```

Persistence is best-effort: if serializing or restoring the cache throws, the plugin skips that write or read instead of crashing. Pass `onStringifyError`/`onParseError` to observe those failures.

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

## Handling Errors

Two errors can happen and are recoverable:

- `onStringifyError` — `JSON.stringify` failed while persisting, e.g. on non-serializable data. The cache is not persisted this time.
- `onParseError` — `JSON.parse` failed while restoring, e.g. on corrupt data. The cache starts fresh and is overwritten on the next successful persist.

A handler you pass is always called, in development and production. With no handler, the error is logged with `console.error` in development only. Pass a handler to report them yourself:

```ts
PiniaColadaCachePersister({
  onStringifyError: (error) => reportToErrorTracker(error),
  onParseError: (error) => reportToErrorTracker(error),
})
```

Storage write errors (e.g. `QuotaExceededError`) are always ignored.

## License

[MIT](http://opensource.org/licenses/MIT)
