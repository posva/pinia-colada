# Pinia Colada Devtools

## DevFrame

The package includes a portable [DevFrame](https://devfra.me/) definition and
adapters for Vite DevTools and a standalone Vite hub.

For a raw DevFrame hub, install the definition together with its dock options:

```ts
import { piniaColadaDevframe, piniaColadaDevframeDock } from '@pinia/colada-devtools'

const piniaColada = {
  devframe: piniaColadaDevframe,
  dock: piniaColadaDevframeDock,
}
```

Add the Vite adapter after the Vite DevTools plugin:

```ts
import { DevTools } from '@vitejs/devtools'
import { PiniaColadaDevtools } from '@pinia/colada-devtools/vite'

export default defineConfig({
  plugins: [DevTools(), PiniaColadaDevtools()],
})
```

Or mount a standalone Devframe hub with its default UI:

```sh
pnpm add -D @devframes/hub @devframes/hub-ui @devframes/vite
```

```ts
import { PiniaColadaDevtoolsStandalone } from '@pinia/colada-devtools/standalone'

export default defineConfig({
  plugins: [PiniaColadaDevtoolsStandalone()],
})
```

## Development

```sh
pnpm run dev
```

## Build and test

Build the package:

```sh
pnpm run build
```

Then test it on the playground (root folder):

```sh
pnpm run play # at root
```
