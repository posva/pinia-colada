<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Delay
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-delay">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-delay/latest" alt="npm package">
</a>

Delay the `asyncStatus` of a query to avoid flickering when refreshing data. The perfect addition to `placeholderData` in your paginated queries 💪.

## Installation

```sh
npm install @pinia/colada-plugin-delay
```

## Usage

```js
import { PiniaColadaDelay } from '@pinia/colada-plugin-delay'

// Pass the plugin to Pinia Colada options
app.use(PiniaColada, {
  // ...
  plugins: [
    PiniaColadaDelay({
      delay: 200, // default delay
    }),
  ],
})
```

You can customize the delay behavior individually for each query with the `delay` option:

```ts
useQuery({
  key: ['todos'],
  query: getTodos,
  delay: false, // disable delay
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
