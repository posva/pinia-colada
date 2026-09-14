# Migrating Devtools from v1 to v2

::: warning Unreleased
Version 2 of `@pinia/colada-devtools` is the upcoming major release. It is **not published yet**. This guide describes the changes currently in development.
:::

The devtools use [Devframe](https://devfra.me/) to embed the same panel in compatible Nuxt, Vue, or Vite devtools. The standalone interface remains available for now, but should become unnecessary as framework devtools add support.

## Breaking changes

- The `PiniaColadaDevtools` and `PiniaColadaProdDevtools` Vue components are removed.
- Setup moves from the app's component tree to a devtools host. The supplied plugins require Vite 7 or 8 and additional host dependencies.
- Production support moves from a component to Vite configuration and static devtools assets.
- The `/panel` and `/shared` package exports are removed. The package root now exports a Devframe definition and its dock configuration.
- The host controls the launcher and panel layout. Saved standalone button position, open state, and panel height are not transferred.

## Remove the Vue components

Remove the import and component from `App.vue` or your Nuxt root component:

```diff
 <script setup lang="ts">
-import { PiniaColadaDevtools } from '@pinia/colada-devtools'
 </script>

 <template>
   <RouterView />
-  <PiniaColadaDevtools />
 </template>
```

Remove `PiniaColadaProdDevtools` in the same way if you use it. Remove any component auto-import configuration for these components.

`PiniaColadaDevtools` is now a Vite plugin imported from `@pinia/colada-devtools/vite`. It is not a Vue component or a Vue plugin for `app.use()`.

## Configure a devtools host

Keep `@pinia/colada-devtools` as a development dependency. Choose one of the following setups.

### Vite DevTools

Install the host dependencies:

```sh
pnpm add -D @pinia/colada-devtools @vitejs/devtools @vitejs/devtools-kit
```

Add the plugins to `vite.config.ts`, with `PiniaColadaDevtools()` after `DevTools()`:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { DevTools } from '@vitejs/devtools'
import { PiniaColadaDevtools } from '@pinia/colada-devtools/vite'

export default defineConfig({
  plugins: [vue(), DevTools(), PiniaColadaDevtools()],
})
```

Open Vite DevTools and select Pinia Colada.

Use Vite DevTools and its kit version 0.7.4 or later with DevFrame 0.10.

### Nuxt DevTools

Update `@pinia/colada-nuxt` to a version with the Devframe integration. Use the Vite builder and Nuxt DevTools 4 or later, then install `@pinia/colada-devtools` as a development dependency:

```sh
pnpm add -D @pinia/colada-devtools
```

Enable devtools in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@pinia/colada-nuxt'],
  devtools: { enabled: true },
})
```

The module registers the panel automatically during development. Open Nuxt DevTools and select Pinia Colada. Nuxt DevTools versions before 4 do not support this integration.

### Vue DevTools

Vue DevTools is adopting the same Devframe foundation. Embedding requires a version with Devframe support. Until your Vue DevTools host supports it, use Vite DevTools or the standalone plugin.

### Standalone

The standalone interface is now a Vite plugin. Install its host dependencies:

```sh
pnpm add -D @pinia/colada-devtools @devframes/hub @devframes/hub-ui @devframes/vite
```

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { PiniaColadaDevtoolsStandalone } from '@pinia/colada-devtools/standalone'

export default defineConfig({
  plugins: [vue(), PiniaColadaDevtoolsStandalone()],
})
```

Use this plugin instead of the embedded integration. The host now controls how you open and resize the panel. The saved v1 launcher position, open state, and panel height are not reused.

MCP support is included through `@devframes/agentic`. The standalone host enables MCP; a custom hub controls MCP through its own `mcp` option.

### Projects without Vite

The supplied integrations require Vite 7 or 8. There is no component replacement for projects with another build tool. A custom Devframe host can use the exports described below; otherwise, keep v1 until your environment has a compatible integration.

## Replace production setup

`PiniaColadaProdDevtools` is removed. For Vite production builds, enable both static host output and the Pinia Colada plugin's production option:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { DevTools } from '@vitejs/devtools'
import { PiniaColadaDevtools } from '@pinia/colada-devtools/vite'

export default defineConfig({
  plugins: [
    vue(),
    DevTools({ build: { withApp: true } }),
    PiniaColadaDevtools({ production: true }),
  ],
})
```

Load `<base>__devtools/embedded.js` as a module script in the built app and deploy the full build output, including the devtools assets. Replace `<base>` with your Vite `base` (default `/`). See the [production setup](../guide/installation.md#keeping-devtools-in-production) for an example of script injection.

The standalone plugin has no production option. The automatic Nuxt integration runs only during development.

## Update custom integrations and imports

| v1 API | v2 replacement |
| --- | --- |
| `PiniaColadaDevtools` from `@pinia/colada-devtools` | `PiniaColadaDevtools()` from `@pinia/colada-devtools/vite` |
| `PiniaColadaProdDevtools` from `@pinia/colada-devtools` | Vite production configuration described above |
| `DevtoolsPanel` from `@pinia/colada-devtools/panel` | A host mounts the panel from `piniaColadaDevframe` |
| Helpers and types from `@pinia/colada-devtools/shared` | No public replacement; remove these imports |

For a custom host, import `piniaColadaDevframe` and `piniaColadaDevframeDock` from `@pinia/colada-devtools`. Register the devframe and its dock client script with your host. The client script is available at `@pinia/colada-devtools/client-script` and connects the inspected app to the panel.

The panel is served as a separate page instead of the `pinia-colada-devtools-panel` custom element. Remove custom element registration and code that uses the old panel or message channel. Use the [Devframe host APIs](https://devfra.me/guide/hub) for custom integrations. The supplied Vite and standalone plugins configure this for you.
