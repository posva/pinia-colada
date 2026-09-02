# Pinia Colada Devtools

## Migrating from v1 to v2

Version 2 moves the devtools out of your Vue component tree and into Vite. Keep
`@pinia/colada-devtools` as a development dependency, then remove the v1
component from your app:

```diff
 <script setup lang="ts">
-import { PiniaColadaDevtools } from '@pinia/colada-devtools'
 </script>

 <template>
   <RouterView />
-  <PiniaColadaDevtools />
 </template>
```

If you used `<PiniaColadaProdDevtools />`, remove it in the same way. Version 2
does not yet support inspecting deployed production builds.

### Vite DevTools

Use this when your project uses the new Vite DevTools:

```sh
pnpm add -D @pinia/colada-devtools @vitejs/devtools @vitejs/devtools-kit
```

```diff
+import { DevTools } from '@vitejs/devtools'
+import { PiniaColadaDevtools } from '@pinia/colada-devtools/vite'

 export default defineConfig({
-  plugins: [vue()],
+  plugins: [vue(), DevTools(), PiniaColadaDevtools()],
 })
```

The Pinia Colada plugin must come after `DevTools()`.

For Nuxt, install `@pinia/colada-devtools` and enable Nuxt DevTools. The Pinia
Colada Nuxt module registers the integration automatically:

```diff
 export default defineNuxtConfig({
   modules: ['@pinia/nuxt', '@pinia/colada-nuxt'],
+  devtools: { enabled: true },
 })
```

### Standalone

If the project does not use Vite DevTools, use the standalone DevFrame UI:

```sh
pnpm add -D @pinia/colada-devtools @devframes/hub @devframes/hub-ui @devframes/vite
```

```diff
+import { PiniaColadaDevtoolsStandalone } from '@pinia/colada-devtools/standalone'

 export default defineConfig({
-  plugins: [vue()],
+  plugins: [vue(), PiniaColadaDevtoolsStandalone()],
 })
```

Both integrations currently run only with the Vite development server. They
are not included in production builds. There is no replacement yet for the old
`<PiniaColadaProdDevtools />`; keep using the previous version if inspecting a
deployed production build is required.

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
