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
    }),
  ],
})

// if using async storage, wait for cache to be restored before mounting the app
// (not needed with localStorage)
await isCacheReady()
app.mount('#app')
```

## Options

| Option     | Type                            | Default                | Description                     |
| ---------- | ------------------------------- | ---------------------- | ------------------------------- |
| `key`      | `string`                        | `'pinia-colada-cache'` | Storage key                     |
| `storage`  | `Storage \| PiniaColadaStorage` | `localStorage`         | Storage backend (sync or async) |
| `filter`   | `UseQueryEntryFilter`           | -                      | Filter which queries to persist |
| `debounce` | `number`                        | `1000`                 | Debounce time in ms             |

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
