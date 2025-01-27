# Quick Start

Pinia Colada is the perfect companion to [Pinia](https://pinia.vuejs.org) to handle **async** state management in your Vue applications. It will remove the need to write boilerplate code for data fetching and transparently bring **caching**, **deduplication**, **invalidation**, **stale while revalidate (swr)** and much more. Allowing you to focus on building the best user experience for your users. **You don't even need to learn Pinia to use Pinia Colada** because it exposes its own composables.

Get a quick overview of how to use Pinia Colada in your project or if you prefer to directly play with the code you can play with Pinia Colada in this [Stackblitz](https://stackblitz.com/github/posva/pinia-colada-example) project.

## Installation

Install Pinia Colada alongside [Pinia](https://pinia.vuejs.org) using your favorite package manager:

```bash
npm i @pinia/colada
```

## Setup

Install the `PiniaColada` plugin **after Pinia** (so it picks it up automatically ✨). This allows you to provide global options for your queries as well as plugins:

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

Let's see a quick example and cover the basics of [queries](./guide/queries.md), [mutations](./guide/mutations.md) and [query invalidation](./guide/query-invalidation.md).

### Querying

Queries **are the most important feature of Pinia Colada**. They are used to declaratively fetch data from an API. Create them with `useQuery()` in any component. They expect a `key` to save the data in the cache and a _param-less_ `query` function that returns the data:

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { getAllProducts } from '@/api/products'
import ProductItem from '@/components/ProductItem.vue'

const {
  state: productList,
  asyncStatus,
} = useQuery({
  key: ['products-list'],
  query: getAllProducts,
})
</script>
```

- The `key` is a serializable array that **uniquely** identifies the query. The array allows to establish [a hierarchy](./guide/query-keys.md#keys-are-hierarchical) of keys that can be invalidated at once.
- The `query` function **takes no arguments** because that allows Pinia Colada to automatically run it when needed ✨.

`useQuery()` returns an object with quite a few properties. In the example above we use:

- `state`: state of the query. It contains the following properties:
  - `data`: the data returned by the query. It automatically updates when the query is refetched.
  - `error`: the error returned by the query. It's `null` if the query was successful.
  - `status`: the data status of the query. It starts as `'pending'`, and then it changes to `'success'` or `'error'` depending on the outcome of the `query` function:

    | status | data | error |
    | ------ | ---- | ----- |
    | `'pending'` | `undefined` | `null` |
    | `'success'` | _defined_ | `null` |
    | `'error'` | `undefined` or _defined_ | _defined_ |

- `asyncStatus`: the async status of the query. It's either `'idle'` or `'loading'` if the query is currently being fetched.

There are a couple of other properties that can be accessed, most of them are just for convenience like `data` (which is an alias for `state.data`) and `error` (which is an alias for `state.error`).

Let's see a more complete example with a list view and a detail view:

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
  state: productList,
  asyncStatus,
} = useQuery({
  key: ['products-list'],
  query: getAllProducts,
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="productList.error">
      <ErrorMessage :error="productList.error" />
    </div>
    <div v-else-if="productList.data">
      <div v-for="product in productList.data" :key="product.id">
        <!-- we could add a prefetch here : @mouseover="prefetch(product.id)" -->
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
  state: product,
  asyncStatus,
} = useQuery({
  // `key` can be made dynamic by providing a function or a reactive property
  key: () => ['products', route.params.id as string],
  query: () => getProductById(route.params.id as string),
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="product.error">
      <ErrorMessage :error="product.error" />
    </div>
    <div v-else class="flex flex-wrap">
      <ProductItemDetail :product="product.data" />
    </div>
  </main>
</template>
```

:::

In this example, we have two pages: one that lists all products and another that shows the details of a specific product. Both pages use `useQuery()` to fetch the data they need. The query in the detail page uses the route params to fetch the specific product.

### Mutating data

Mutations allow us to **modify** data on the server and notify related queries so they can automatically refetch the data. Create mutations with `useMutation()` in any component. Unlike _queries_, mutations only require a `mutation` function, the `key` is optional:

```vue twoslash
<script setup lang="ts">
// @moduleResolution: bundler
import { useMutation } from '@pinia/colada'
import { patchContact } from '@/api/contacts'
import type { Contact } from '@/api/contacts'
import ContactDetail from '@/components/ContactDetail.vue'

const {
  mutate,
  state,
  asyncStatus,
} = useMutation({
  mutation: (contact: Contact) => patchContact(contact),
})
</script>
```

Mutations are never called automatically, you **have to call them manually** with `mutate`. This allows you to pass one single argument to the mutation function. In general, prefer explicitly passing data to mutations instead of relying on the component's state, _this will make everything so much better_ 😉.

As you can see, `useMutation()` returns a very similar object to `useQuery()`, it's mostly about the mutation async state. Instead of `refresh()` we have `mutate()`.

Let's see a more complete example with a mutation to update a contact and to invalidate other queries.

```vue twoslash
<script setup lang="ts">
// ---cut-start---
import './shims-vue.d'
import ErrorMessage from '@/components/ErrorMessage.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'
// ---cut-end---
// @moduleResolution: bundler
import { useMutation, useQueryCache } from '@pinia/colada'
import { patchContact } from '@/api/contacts'
import type { Contact } from '@/api/contacts'
import ContactDetail from '@/components/ContactDetail.vue'

const props = defineProps<{ contact: Contact }>()

// we use the query cache to invalidate queries
const queryCache = useQueryCache()

const {
  mutate: updateContact,
  state,
  asyncStatus,
} = useMutation({
  mutation: (contact: Contact) => patchContact(contact),
  onSettled(updatedContact, error, contact) {
    // invalidate the contact list and detail queries
    // they will be refetched automatically if they are being used
    queryCache.invalidateQueries({ key: ['contacts-list'] })
    queryCache.invalidateQueries({ key: ['contacts', contact.id] })
  },
})
</script>

<template>
  <main>
    <LoadingIndicator v-if="asyncStatus === 'loading'" />

    <div v-if="state.error">
      <ErrorMessage :error="state.error" />
    </div>
    <div v-else>
      <ContactDetail
        :contact="props.contact"
        :is-updating="asyncStatus === 'loading'"
        @update="updateContact"
      />
    </div>
  </main>
</template>
```

By using the `onSettled()` hook, we can invalidate queries when the mutation is done. We get access to the data returned by the `patchContact(query)`, the error if it failed, and the `contact` that was passed to the `mutate()` call. Then we use the `queryCache` to invalidate the queries we want. Invalidated queries are automatically refetched if they are actively being used ✨.

### The Query Cache

In the mutation example we introduce the usage of the _Query Cache_. It allows us to access and modify the cache from anywhere as well as trigger cache invalidations. It's a powerful tool that enables us to write decoupled Mutations and Queries in a well organized way.

### Going further

Pinia Colada offers a wealth of features to enhance your application's performance and user experience, all while helping you write more maintainable code. Explore the following guides to learn more:

- [Why use Pinia Colada?](./why.md)
- [Reusable Queries](./guide/queries.md#reusable-queries)
- [Mutations](./guide/mutations.md)
- [Cache Invalidation](./guide/query-invalidation.md)
- [Optimistic updates](./guide/optimistic-updates.md)
- [Query Cache](./advanced/query-cache.md)
