# Nuxt

Pinia Colada integrates seamlessly with Nuxt via its dedicated module. It provides advanced caching, automatic deduplication, mutations with optimistic updates, and cross-component data sharing that goes beyond what Nuxt's built-in data fetching offers.

## Choosing Your Data Fetching Approach

Both Nuxt's native composables (`useFetch`/`useAsyncData`) and Pinia Colada can fetch data with SSR support. Here's when to use each:

| Feature                | Nuxt Native                | Pinia Colada                     |
| ---------------------- | -------------------------- | -------------------------------- |
| Best for               | Simple page-level data     | Complex app-wide state           |
| SSR                    | `await` required           | Automatic via `onServerPrefetch` |
| Parallel requests      | Manual via `Promise.all`   | Automatic                        |
| Caching                | Manual via `getCachedData` | Automatic + deduplication + GC   |
| Mutations              | Manual                     | Built-in `useMutation`           |
| Optimistic updates     | Manual                     | Built-in                         |
| Scope                  | Pages (prop drilling)      | Any component                    |
| Stale-while-revalidate | Manual                     | Built-in                         |

::: tip When to use Nuxt's native `useFetch`/`useAsyncData`

- Simple page-specific data that isn't shared across components
- One-off API calls without complex caching needs
- Single requests without parallel fetching

:::

::: tip When to use Pinia Colada

- Data shared across multiple components or pages
- When you need automatic cache invalidation and garbage collection
- When you have parallel requests within a component
- If you need cache persistence
- Mutations with optimistic updates
- Complex apps with lots of interdependent data
- When deduplication and stale-while-revalidate matter

:::

## Installation

::: code-group

```bash [pnpm]
pnpm add @pinia/colada
pnpm dlx nuxi module add @pinia/colada-nuxt
```

```bash [npm]
npm install @pinia/colada
npx nuxi module add @pinia/colada-nuxt
```

```bash [yarn]
yarn add @pinia/colada
yarn dlx nuxi module add @pinia/colada-nuxt
```

:::

Or manually by installing it and adding it to your `nuxt.config.ts`:

::: code-group

```bash [pnpm]
pnpm add @pinia/colada @pinia/colada-nuxt
```

```bash [npm]
npm install @pinia/colada @pinia/colada-nuxt
```

```bash [yarn]
yarn add @pinia/colada @pinia/colada-nuxt
```

:::

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/colada-nuxt'],
})
```

::: info

Since Pinia Colada depends on Pinia, you also need to install its Nuxt module:

```bash
npx nuxi module add pinia
```

:::

## Configuration

You can configure the Pinia Colada plugin by creating a `colada.options.ts` file at the root of your project.

```ts
// colada.options.ts
import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  // Options here
} satisfies PiniaColadaOptions
```

These options will get passed to the `PiniaColada` Vue plugin. This allows you to add options like [plugins](./guide/installation.md#Plugins).

## SSR Without `await`

**The key difference from Nuxt's data fetching: Pinia Colada doesn't require `await` for SSR.**

With Nuxt's `useFetch`, you must `await` to block SSR and wait for data:

```vue
<script lang="ts" setup>
// Nuxt: await required for SSR
const { data } = await useFetch('/api/products')
</script>
```

With Pinia Colada, `useQuery` uses `onServerPrefetch` internally, so queries automatically run and await on the server without explicit `await`:

```vue
<script lang="ts" setup>
// Pinia Colada: no await needed, SSR works automatically
const { data } = useQuery({
  key: ['products'],
  query: () => $fetch('/api/products'),
})
</script>
```

### How it works

1. On the server, `useQuery` automatically registers via `onServerPrefetch`
2. The query runs and awaits during server-side rendering
3. Data is serialized to the payload and hydrated on the client
4. No extra code needed—it just works

### When you still need `await`

Using `await` with `useQuery` is still useful when you want to **block client side navigation** until data loads:

```vue
<script lang="ts" setup>
const { data, refresh } = useQuery({
  key: ['products'],
  query: () => $fetch('/api/products'),
})
// Block navigation until products load
await refresh()
</script>
```

Without `await`, the page renders immediately (showing loading states), and data populates when ready.

Another alternative is to use [Data Loaders](https://uvr.esm.is/data-loaders/colada/), which connect the data fetching lifecycle to Vue Router (and therefore Nuxt) navigation system.

## Migration Guide

### `useFetch` → `useQuery`

```vue
<script setup lang="ts">
const { data, pending, error, refresh } = await useFetch('/api/products') // [!code --]
const { data, isPending, error, refresh } = useQuery({ // [!code ++]
  key: ['products'], // [!code ++]
  query: () => $fetch('/api/products'), // [!code ++]
}) // [!code ++]
</script>
```

Key differences:

- `pending` → `isPending`
- Add a unique `key` for caching
- Wrap the fetch in `query` option
- Remove `await`:
  - SSR works automatically
  - Add `await refresh()` if you want to block navigation until data loads

### `useAsyncData` → `useQuery`

```vue
<script lang="ts" setup>
const { data } = await useAsyncData( // [!code --]
  'products', // [!code --]
  () => $fetch('/api/products'), // [!code --]
  { // [!code --]
    getCachedData(key, nuxtApp) { // [!code --]
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key] // [!code --]
    }, // [!code --]
  }, // [!code --]
) // [!code --]
// [!code --]
// Pinia Colada: caching is automatic // [!code ++]
const { data } = useQuery({ // [!code ++]
  key: ['products'], // [!code ++]
  query: () => $fetch('/api/products'), // [!code ++]
  staleTime: 1000 * 60, // optional: data fresh for 1 minute // [!code ++]
}) // [!code ++]
</script>
```

### Adding mutations

Check out the full [Mutations Guide](./guide/mutations.md) for more details.

### Shared data across components

**Before (Nuxt):** Pass data down via props from page components

```vue
<!-- pages/products.vue -->
<script lang="ts" setup>
const { data: products } = await useFetch('/api/products')
</script>

<template>
  <!-- Must pass products to every child that needs it -->
  <ProductList :products="products" />
  <ProductSummary :products="products" />
</template>
```

**After (Pinia Colada):** Any component can access the same cached data

```vue
<!-- components/ProductList.vue -->
<script lang="ts" setup>
// Same key = same cached data, no props needed
const { data: products } = useQuery({
  key: ['products'],
  query: () => $fetch('/api/products'),
})
</script>
```

```vue
<!-- components/ProductSummary.vue -->
<script lang="ts" setup>
import { useQuery } from '@pinia/colada'

// Shares cache with ProductList, no duplicate requests
const { data: products } = useQuery({
  key: ['products'],
  query: () => $fetch('/api/products'),
})
</script>
```

Check the [Query Organization Guide](/docs/guide/queries.md#Organizing-Queries) for best practices on organizing shared queries.

## Error Handling with SSR

Standard JavaScript `Error` objects work out of the box. For custom error classes, you'll need to define [custom payload plugins](https://nuxt.com/blog/v3-4#payload-enhancements) to serialize them:

```ts
// plugins/my-error.ts
import { MyError } from '~/errors'

export default definePayloadPlugin(() => {
  definePayloadReducer(
    'MyError',
    // serialize the data we need as an array, object, or any serializable format
    (data) => data instanceof MyError && [data.message, data.customData],
  )
  definePayloadReviver(
    'MyError',
    // revive the data back to an instance of MyError
    ([message, customData]) => new MyError(message, customData),
  )
})
```
