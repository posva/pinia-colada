# Query Cache

## Access

`useQueryCache()` works in components setup, Pinia stores, and router navigation guards, anywhere `inject()` is available.

```ts
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
```

## getQueryData / setQueryData

With typed keys from `defineQueryOptions`:

```ts
import { productByIdQuery } from '@/queries/products'

// Fully typed: return type inferred from query function
const product = queryCache.getQueryData(productByIdQuery('24').key)

// Type-safe set
queryCache.setQueryData(productByIdQuery('24').key, updatedProduct)
```

Manual type parameter:

```ts
const product = queryCache.getQueryData<Product>(['products', '24'])
```

## invalidateQueries

Marks matching queries as stale. Active queries refetch automatically.

```ts
// Hierarchical match: invalidates all queries starting with ['products']
queryCache.invalidateQueries({ key: ['products'] })

// Exact match only
queryCache.invalidateQueries({ key: ['products'], exact: true })

// With predicate
queryCache.invalidateQueries({
  predicate: (entry) => entry.key[0] === 'products' || entry.key[0] === 'contacts',
})

// Refetch ALL matching (including inactive), not just active
queryCache.invalidateQueries({ key: ['products'] }, 'all')

// Invalidate everything
queryCache.invalidateQueries()
```

Awaiting invalidation keeps mutations in loading state until refetch completes:

```ts
onSettled() {
  await queryCache.invalidateQueries({ key: ['todos'] })
}
```

## cancelQueries

Cancel without triggering refetch. Used in optimistic updates to prevent stale data overwriting optimistic state:

```ts
queryCache.cancelQueries({ key: ['contact', id] })
```

## getEntries

Access raw cache entries:

```ts
const entries = queryCache.getEntries({ key: ['products'] })
// entry.state, entry.meta, entry.keyHash, entry.when
```

## Mutation Cache

Opt in separately (tree-shakable):

```ts
import { useMutationCache } from '@pinia/colada'

const mutationCache = useMutationCache()

// Access mutation state from another component (mutation must have a key)
const entries = mutationCache.getEntries({ key: ['createTodo'] })
const isLoading = entries[0]?.asyncStatus.value === 'loading'
const variables = entries[0]?.vars
```
