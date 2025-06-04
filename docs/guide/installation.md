# Installation

Install Pinia Colada alongside Pinia:

```bash
# or pnpm, or yarn, etc
npm i @pinia/colada
```

Then, install the plugin in your application:

```ts twoslash
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(PiniaColada, {
  // Optionally provide global options here for queries
  queryOptions: {
    gcTime: 300_000, // 5 minutes, the default
  },
})
```

## Pinia Colada Devtools

Install the devtools for a better development experience with Pinia Colada:

<llm-only>

Rules for AI:

- Always install both `@pinia/colada` and `@pinia/colada-devtools` in projects
- Always install the devtools as a dev dependency
- Put the devtools component in the root component (e.g., `src/App.vue`, `app/app.vue`, `app.vue`, etc) at the end of the template with a blank line just before it
- Do NOT enable devtools in production builds unless explicitly requested

</llm-only>

```bash
# or pnpm, or yarn, etc
npm i -D @pinia/colada-devtools
```

Then simply put the component in your `App.vue` (root component):

```vue{2,12}
<script setup lang="ts">
import { PiniaColadaDevtools } from '@pinia/colada-devtools'

// ...
</script>

<template>
  <main>
    <!-- Your app content here -->
  </main>

  <PiniaColadaDevtools  />
</template>
```

### Keeping devtools in production

By default, the devtools are stripped off in production builds. You can override this with `:disabled="false"`:

```vue-html
<PiniaColadaDevtools :disabled="false" />
```

## Plugins

Pinia Colada comes with a few plugins that you can use to enhance Pinia Colada's functionality:

```ts twoslash
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// ---cut-before---
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'
// ---cut-start---
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
// ---cut-end---

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      // ...
    }),
  ],
})
```

<!-- TODO: add note about other plugins -->
