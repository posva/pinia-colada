<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Auto Refetch
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-auto-refetch">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-auto-refetch/latest" alt="npm package">
</a>

Automatically refetch queries when they become stale in Pinia Colada.

## Installation

```sh
npm install @pinia/colada-plugin-auto-refetch
```

## Usage

```js
import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

// Pass the plugin to Pinia Colada options
app.use(PiniaColada, {
  // ...
  plugins: [
    PiniaColadaAutoRefetch({ autoRefetch: true }), // enable globally
  ],
})
```

You can customize the refetch behavior individually for each query with the `autoRefetch` option:

```ts
// true: use existing staleTime
useQuery({
  key: ['todos'],
  query: getTodos,
  staleTime: 10000,
  autoRefetch: true, // refetch every 10 seconds
})

// Number: custom interval in milliseconds
useQuery({
  key: ['posts'],
  query: getPosts,
  staleTime: 5000,
  autoRefetch: 10000, // refetch every 10 seconds
})

// Function: conditional refetching based on query state
useQuery({
  key: () => ['tasks', id.value],
  query: getDocuments,
  autoRefetch: (state) => {
    // Polling based on data state
    return state.data?.running ? 5000 : false
  },
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
