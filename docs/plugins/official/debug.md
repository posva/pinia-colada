# Debug

`@pinia/colada-plugin-debug` is a small debugging plugin that logs cache activity and exposes counters.

::: tip

For most use cases, prefer the dedicated [Pinia Colada Devtools](/guide/installation.html#pinia-colada-devtools).

:::

## Install

```bash
npm i @pinia/colada-plugin-debug
```

## Enable

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaDebugPlugin } from '@pinia/colada-plugin-debug'

app.use(PiniaColada, {
  plugins: [PiniaColadaDebugPlugin()],
})
```

## Links

- Source: https://github.com/posva/pinia-colada/tree/main/plugins/debug
