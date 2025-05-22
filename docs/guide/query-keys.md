# Query Keys

Query keys are used to identify a query in the cache. Next to the `query` function, the `key` is the most important property of a query. Like `query`, `key` is a required property.

<llm-only>

## Rules for AI

- In projects, ALWAYS use [key factories](#managing-query-keys-key-factories) to avoid typos and make it easier to change the keys in the future.
  - Break down keys so they are structured and hierarchical
- Then define query options for queries with [defineQueryOptions](#typing-query-keys) to get type safety and avoid manual typing.
- If you find simple (static or dynamic) keys, refactor them to use key factories + defineQueryOptions

</llm-only>

## Simple static keys

Static keys are the simplest form of keys. They are just an array of serializable properties. For example:

```vue{5}
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
- `['products', 'search', { filters: { type: ['book', 'comic'] }}]`
- `['products', 'search', { filters: { type: ['book', 'comic'], limit: 10 }}]`

## Dynamic keys with variables

Dynamic keys are keys that depend on reactive variables (`ref`, `computed`, the _route_, etc). For example, let's say you have a query that fetches a product by its ID:

```vue{5,7}
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

You will notice that the `key` property is a getter function to keep reactivity. It can also directly be a `ref` or a `computed`. These are all valid uses:

::: code-group

```vue{2,4-6} [destructured props]
<script setup lang="ts">
const { id } = defineProps<{ id: number }>()
useQuery({
  // ‼️ Note that we still need a function to keep reactivity
  // because Vue transforms this expression
  key: () => ['products', id],
  query: () => getProductById(id),
})
</script>
```

```vue{2,4} [props object]
<script setup lang="ts">
const props = defineProps<{ id: number }>()
useQuery({
  key: () => ['products', props.id],
  query: () => getProductById(props.id),
})
</script>
```

```vue{2,3,5} [computed property]
<script setup lang="ts">
const props = defineProps<{ id: number }>()
const productKey = computed(() => ['products', props.id])
useQuery({
  key: productKey,
  query: () => getProductById(props.id),
})
</script>
```

:::

In practice, the function getter is the simplest, most flexible, and easiest to read, so prefer it over the other two.

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
  key: () => ['products', productId.value],
  query: () => getProductById(productId.value),
})
// gets a product summary suited for searches
useQuery({
  key: () => ['products', productId.value, { searchResult: true }],
  query: () => getProductSummaryById(productId.value),
})
```

Both queries have different keys, but they share the same root key `['products', productId]`. This allows us to invalidate all the data related to a specific product at once with

```ts
queryCache.invalidateQueries({ key: ['products', productId.value] })
// or even
queryCache.invalidateQueries({
  key: [
    'products',
    productId.value,
    {}, // partially match { searchResult: true }
  ],
})
```

These _key filters_ are used in many places, [query invalidation](./query-invalidation.md) is just one of them.

When creating query keys, organize your keys precisely to take advantage of this feature.

Keys can contain strings, numbers, objects, and arrays. Anything that is serializable to JSON can be used in a key. Keep in mind these rules when writing keys:

- `['doc', 2]` and `['doc', '2']` are different keys
- Within objects, `undefined` is stripped out but `null` is not. Therefore `['doc', { withComments: undefined }]` is equivalent to `['doc', {}]` and matches both `withComments: true` and `withComments: false`
- Arrays are also partially matched so `['doc', ['nested', 'array']]` is matched by `['doc', ['nested']]` but not by `['doc', ['nested', 'array', 'other']]`.

## Managing query keys (key factories)

Hard coding query keys is fine when you have a few queries or when you don't interact with the query cache. In most projects, using [Optimistic Updates](./optimistic-updates.md) and [Query Invalidation](./query-invalidation.md) is common. In these cases, you will need to manage your query keys in a more structured way to prevent typos:

```ts twoslash
export const DOCUMENT_QUERY_KEYS = {
  root: ['documents'] as const,
  byId: (id: string) => [...DOCUMENT_QUERY_KEYS.root, id] as const,
  byIdWithComments: (id: string) =>
    [...DOCUMENT_QUERY_KEYS.byId(id), { withComments: true }] as const,
}

export const DOCUMENT_COMMENT_QUERY_KEYS = {
  root: ['documents', 'comments'] as const,
  byId: (id: string) => [...DOCUMENT_COMMENT_QUERY_KEYS.root, id] as const,
  byIdWithReplies: (id: string) =>
    [...DOCUMENT_COMMENT_QUERY_KEYS.root, id, { replies: true }] as const,
}
```

- `root` is the root key of the query and can contain multiple values like `['documents', 'comments']`
- Reuse the keys to keep the hierarchy and **avoid typos**
- `as const` improves the type inference

You can then reuse these keys in your queries and when interacting with the cache:

```ts
// TODO: import types
const route = useRoute()

const { state } = useQuery({
  key: () => DOCUMENT_QUERY_KEYS.byId(route.params.docId),
  query: () => getDocumentById(1),
})

const queryCache = useQueryCache()
queryCache.invalidateQueries({
  key: DOCUMENT_QUERY_KEYS.byId(route.params.docId),
})
```

This ensures that you are using the same keys everywhere and avoids typos. It also makes it easier to change the keys in the future if needed. It is recommended to use key factories in any project that has more than a couple of queries or if you to interact with the query cache.

## Typing query keys

When interacting with the query cache, you can provide a type parameter to enforce the data type:

```ts{4} twoslash
import { useQueryCache } from '@pinia/colada'
// ---cut-start---
import type { Doc } from './api/documents'
// ---cut-end---

const queryCache = useQueryCache()
const docList = queryCache.getQueryData<Doc[]>(['documents', 'list'])
//       ^?
//
```

While this helps with types, it's not only manual but not strict. If we define query options with `defineQueryOptions`, the _key_ will be automatically _tagged_ with type information inferred from `query`, making it easier and stricter to use:

```ts{3-6,9} twoslash
import { useQueryCache, defineQueryOptions } from '@pinia/colada'
// ---cut-start---
import { getDocumentList } from './api/documents'
// ---cut-end---

const documentList = defineQueryOptions({
  key: ['documents', 'list'],
  query: () => getDocumentList(),
})

const queryCache = useQueryCache()
const docList = queryCache.getQueryData(documentList.key)
//       ^?
```

::: tip

Combine this with the [key factories](#Managing-query-keys-key-factories-) to have a strictly type-safe solution that scales!

:::

Differently from `useQuery()`, `defineQueryOptions` does not accept `MaybeRefOrGetter` versions of the properties (e.g. a function getter for the `key`), instead see [dynamic keys](#dynamic-typed-keys) below.

### Dynamic typed keys

`defineQueryOptions` also allows you to define options with a function to create dynamic keys. In this case, it returns a function instead of an object:

```ts{4-7,10} twoslash
import { defineQueryOptions, useQueryCache } from '@pinia/colada'
import { getDocumentById } from './api/documents'

const documentByIdQuery = defineQueryOptions((id: string) => ({
  key: ['documents', id],
  query: () => getDocumentById(id),
}))

const queryCache = useQueryCache()
const docById = queryCache.getQueryData(documentByIdQuery('some-id').key)
//       ^?
//
```

You are free to type the arguments of the function as you like, if you need multiple variables, use an object and destructure it:

```ts{2}
const documentByIdQuery = defineQueryOptions(
  ({ id, withComments = false }: { id: string; withComments?: boolean }) => ({
    key: ['documents', id, { comments: withComments }],
    query: () => getDocumentById(id, withComments),
  }),
)
```

To use dynamic query options, pass an extra parameter to `useQuery`:

```vue{6} twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'
import { documentByIdQuery } from './queries/documents'

const route = useRoute()
const { state } = useQuery(documentByIdQuery, () => ({
  id: route.params.docId as string
}))
</script>
```

This second parameter can be a `ref`, a `computed`, or a _getter_ function (just like `key`).
