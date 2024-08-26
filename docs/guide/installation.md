# Installation

Install Pinia Colada alongside Pinia:

```bash
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
app.use(PiniaColada)
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
