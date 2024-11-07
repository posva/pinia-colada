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
    PiniaColadaAutoRefetch(),
  ],
})
```

You can customize the refetch behavior individually for each query with the `autoRefetch` option:

```ts
useQuery({
  key: ['todos'],
  query: getTodos,
  autoRefetch: false, // disable auto refetch
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
