<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Retry
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-retry">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-retry/latest" alt="npm package">
</a>

Retry failed queries or mutations with your Pinia Colada.

## Installation

```sh
npm install @pinia/colada-plugin-retry
```

## Usage

```js
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

// Pass the plugin to Pinia Colada options
app.use(PiniaColada, {
  // ...
  plugins: [
    PiniaColadaRetry({
      // Pinia Colada Retry options
    }),
  ],
})
```

You can customize the retry behavior individually for each query/mutation with the `retry` option:

```ts
useQuery({
  key: ['todos'],
  query: getTodos,
  retry: {
    // Number of retries, can also be a function
    retry: 3,
    // Delay between retries, can also be a function
    delay: 1000,
  },
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
