# @pinia/colada-plugin-tanstack-compat

TanStack Query compatibility layer for Pinia Colada. Adds TanStack Query Vue v5 compatible properties to `useQuery` and `useMutation`, making migration from TanStack Query easier.

## Installation

```bash
# pnpm
pnpm add @pinia/colada-plugin-tanstack-compat

# npm
npm install @pinia/colada-plugin-tanstack-compat

# yarn
yarn add @pinia/colada-plugin-tanstack-compat
```

## Setup

Register the plugin when installing Pinia Colada:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaTanStackCompat } from '@pinia/colada-plugin-tanstack-compat'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PiniaColada, {
  plugins: [PiniaColadaTanStackCompat()],
})
```

## Quick Example

```vue
<script setup>
import { useQuery } from '@pinia/colada'

const { data, isSuccess, isError, isFetching, isStale } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((r) => r.json()),
})
</script>

<template>
  <div v-if="isFetching">Loading...</div>
  <div v-else-if="isError">Error!</div>
  <div v-else-if="isSuccess">
    <span v-if="isStale">(stale)</span>
    {{ data }}
  </div>
</template>
```

## Documentation

For full documentation including all features, API reference, and migration guide, see [docs/tanstack-compat.md](./docs/tanstack-compat.md).

## License

MIT
