<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Refetch Interval
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-refetch-interval">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-refetch-interval/latest" alt="npm package">
</a>

Refetch queries on a regular interval with your Pinia Colada.

## Installation

```sh
npm install @pinia/colada-plugin-refetch-interval
```

## Usage

```js
import { PiniaColadaRefetchInterval } from '@pinia/colada-plugin-refetch-interval'

// Pass the plugin to Pinia Colada options
app.use(PiniaColada, {
  // ...
  plugins: [
    PiniaColadaRefetchInterval({
      refetchInterval: 1000, // Optional, defaults to false
      refetchIntervalInBackground: true, // Optional, defaults to false
    }),
  ],
})
```

You can customize the refetch interval behavior individually for each query/mutation with the `refetchInterval` option:

```ts
useQuery({
  key: ['todos'],
  query: getTodos,
  refetchInterval: 1000, // Optional, defaults to false
  refetchIntervalInBackground: true, // Optional, defaults to false
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
