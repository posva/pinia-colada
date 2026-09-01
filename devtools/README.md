# Pinia Colada Devtools

## DevFrame

The package includes a portable [DevFrame](https://devfra.me/) definition and
adapters for Vite DevTools and Nuxt DevTools 4.

For a raw DevFrame hub, install the definition together with its dock options:

```ts
import { createPiniaColadaDevframe, piniaColadaDevframeDock } from '@pinia/colada-devtools/devframe'

const piniaColada = {
  devframe: createPiniaColadaDevframe(),
  dock: piniaColadaDevframeDock,
}
```

Add the Vite adapter after the Vite DevTools plugin:

```ts
import { DevTools } from '@vitejs/devtools'
import { PiniaColadaDevtools } from '@pinia/colada-devtools/devframe/vite'

export default defineConfig({
  plugins: [DevTools(), PiniaColadaDevtools()],
})
```

Or add the Nuxt adapter to a Nuxt 4 project with DevTools enabled:

```ts
export default defineNuxtConfig({
  modules: ['@pinia/colada-devtools/devframe/nuxt'],
  devtools: { enabled: true },
})
```

### MCP

The devframe exposes read-only agent tools for listing the inspected app's
queries and mutations, plus a resource containing the latest cache snapshot.
Standalone devframe servers publish these at their standard `__mcp` endpoint.
When the definition is mounted in a hub, the tools are included in the hub's
aggregate MCP endpoint when MCP is enabled by that host.

The inspected-page bridge synchronizes the cache when its dock client script
loads. In hosts that load client scripts lazily, open the Pinia Colada dock once
before querying it through MCP.

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
