<h1>
  <img height="76" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada Debug Plugin
</h1>

<a href="https://npmjs.com/package/@pinia/colada-plugin-retry">
  <img src="https://badgen.net/npm/v/@pinia/colada-plugin-retry/latest" alt="npm package">
</a>

Debug plugin for Pinia Colada. This is mostly a playground for plugins, it logs out the queries and mutations but it's better to use devtools instead.

## Installation

```sh
npm install @pinia/colada-plugin-debug
```

## Usage

```js
import { PiniaColadaDebug } from '@pinia/colada-plugin-debug'

// Pass the plugin to Pinia Colada options
app.use(PiniaColada, {
  // ...
  plugins: [PiniaColadaDebug()],
})
```

## License

[MIT](http://opensource.org/licenses/MIT)
