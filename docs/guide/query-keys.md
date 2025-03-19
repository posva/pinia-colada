# Query Keys

Query keys are used to identify a query in the cache. Next to the `query` function, the `key` is the most important property of a query. Like `query`, `key` is a required property.

## Simple static keys

Static keys are the simplest form of keys. They are just an array of serializable properties. For example:

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { state } = useQuery({
  key: ['products'],
  query: () => getProducts(),
})
</script>
```

This is common for queries that call a fixed endpoint like `/api/products` (List or Index resources) as well as global resources like the user information.

Anything that is serializable is valid in a key. These are all different keys:

- `['products', 1]`
- `['products', '1']`
- `['products', { id: 1 }]`
- `['products', { id: 1, type: 'book' }]`

## Dynamic keys with variables

Dynamic keys are used when the key depends on some variables. For example, let's say you have a query that fetches a product by its ID:

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'

const route = useRoute()
const { state } = useQuery({
  key: () => ['products', route.params.id],
  query: () => getProductById(route.params.id),
})
</script>
```

::: tip

When creating query keys, **make your key depend on any variable used in your `query` function**. For example, let's say you use the route params in your query, you should include them in the key. This is crucial to ensure queries are cached independently and invalidated correctly.

```ts
useQuery({
  // ✅
  key: () => ['products', route.params.id],
  query: () => getProductById(route.params.id),
})
useQuery({
  // ❌ `key` should be a function
  key: ['products', route.params.id],
  query: () => getProductById(route.params.id),
})
useQuery({
  // ❌ `key` should depend on `route.params.id`
  key: () => ['products'],
  query: () => getProductById(route.params.id),
})
```

:::

## Keys are hierarchical

One of the most powerful features of query keys is that they are hierarchical. This means that you can nest keys to create a hierarchy of queries. For example, let's say you have a query that fetches the information of a product with all its details while you have another one that only fetches a summary of that product to be shown in a search. Their keys would look like this:

```ts
// gets the product with all its details
useQuery({
  key: () => ['products', productId],
  query: () => getProductById(productId),
})
useQuery({
  key: () => ['products', productId, { searchResult: true }],
  query: () => getProductSummaryById(productId),
})
```

Both queries have different keys, but they share the same root key `['products', productId]`. This is useful because when you invalidate the product with all its details, you also invalidate the summary. You can read more about this in the [query invalidation section](./query-invalidation.md). When creating query keys, organize your keys precisely to take advantage of this feature.

Keys can contain strings, numbers, simple objects, and arrays. Anything that is serializable can be used in a key.
