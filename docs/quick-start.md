# Quick Start

Get a quick overview of how to use Pinia Colada in your project.

If you prefer to directly play with the code you can play with Pinia Colada in this [Stackblitz](https://stackblitz.com/github/posva/pinia-colada-example) project.

## Installation

Install Pinia Colada alongside [Pinia](https://pinia.vuejs.org) using your favorite package manager:

```bash
npm i @pinia/colada
```

## Setup

Install the `PiniaColada` plugin **after Pinia** (so it picks it up automatically ✨):

```ts twoslash
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

const app = createApp({})
app.use(createPinia())
app.use(PiniaColada)

app.mount('#app')
```

## Usage

### Querying

Query data with `useQuery()` in any component. Always provide a `key` and an _async_ `query`:

<!-- TODO: use @annotate: once it works instead of comments above the interesting line -->

::: code-group

```vue [pages/products.vue] twoslash
<script setup lang="ts">
// ---cut-start---
import './shims-vue.d'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
// ---cut-end---
// @moduleResolution: bundler
import { useQuery } from '@pinia/colada'
import { getAllProducts } from '@/api/products'
import ProductItem from '@/components/ProductItem.vue'

const {
  // when using multiple queries in the same component,
  // it is convenient to rename `data`
  data: productList,
  asyncStatus,
  error,
} = useQuery({
  key: ['products-list'],
  query: getAllProducts,
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="error">
      <ErrorMessage :error="error" />
    </div>
    <div v-else-if="productList">
      <div v-for="product in productList" :key="product.id">
        <!--  add prefetch here : @mouseover="prefetch(product.id)" -->
        <ProductItem :product="product" />
      </div>
    </div>
  </main>
</template>
```

```vue [pages/products/[id].vue] twoslash
<script setup lang="ts">
// ---cut-start---
import './shims-vue.d'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
// ---cut-end---
// @moduleResolution: bundler
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'
import { getProductById } from '@/api/products'
import ProductItemDetail from '@/components/ProductItemDetail.vue'

// in this example we use the url params in the query to fetch
// a specific product
const route = useRoute()

const {
  data: product,
  asyncStatus,
  error,
} = useQuery({
  key: () => ['products', route.params.id as string],
  query: () => getProductById(route.params.id as string),
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="error">
      <ErrorMessage :error="error" />
    </div>
    <div v-else class="flex flex-wrap">
      <ProductItemDetail :product="product" />
    </div>
  </main>
</template>
```

:::

### Mutating data

Mutate data with `useMutation()` in any component. Unlike _queries_, mutations only require a `mutation` function, the `key` is optional:

```vue twoslash
<script setup lang="ts">
// ---cut-start---
import './shims-vue.d'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
// ---cut-end---
// @moduleResolution: bundler
import { useMutation } from '@pinia/colada'
import { type Contact, updateContact } from '@/api/contacts'
import ContactDetail from '@/components/ContactDetail.vue'

const props = defineProps<{ contact: Contact }>()

const {
  // we use the async version of the mutation so ContactDetail
  // can use the asyncStatus to disable a form
  mutateAsync,
  asyncStatus,
  error,
} = useMutation({
  mutation: (contact: Contact) => updateContact(contact),
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="error">
      <ErrorMessage :error="error" />
    </div>
    <div v-else>
      <ContactDetail :contact="props.contact" @update="mutateAsync" />
    </div>
  </main>
</template>
```

Invalidated queries will be refetched automatically if they are actively being used ✨.

### Going further

Pinia Colada has much more to offer! It can greatly improves your application's performance and user experience. Check out the following guides to learn more:

- [Why use Pinia Colada?](./why.md)
- [Cache Invalidation](./cache-invalidation.md)
- [Optimistic updates](./optimistic-updates.md)
