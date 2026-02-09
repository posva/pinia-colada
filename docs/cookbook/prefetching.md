# Prefetching queries

Prefetching queries is a way to ensure that your data is ready before `useQuery()` is called. Usually done before navigating to a page or to prefetch results in paginated results. You have multiple ways to prefetch queries.

## Thanks to defineQueryOptions

When options do not contain dynamic keys, they can be easily prefetched by _ensuring_ and _refreshing_ an entry:

```ts
import { defineQueryOptions, useQueryCache } from '@pinia/colada'

const userListQuery = defineQueryOptions({
  key: ['users', 'list'],
  query: () => fetch('/api/users').then((res) => res.json()),
})

const queryCache = useQueryCache()
await queryCache.refresh(queryCache.ensure(userListQuery))
```

It's up to you to await it or not. If a component that uses this query is mounted after the prefetch, it will **reuse the cached data or the ongoing request**.

Using `defineQueryOptions` is the recommended way to define queries that you want to prefetch, as it allows you to easily reference queries and **is type-safe**.

## Setting the data directly

You can also set the data directly in the cache. This is useful when you get the data from another source rather than making a request:

```ts
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
queryCache.setQueryData(
  ['users', 'list'],
  // don't forget the await!
  await fetch('/api/users').then((res) => res.json()),
)
```

Differently from using `ensure()` or `useQuery()`, this does not attach any query options to the cache entry, so it won't be able to refetch or know when the data is stale. In most cases this is fine, but if you want to have a fully functional query, it's better to use `ensure()` first to attach options to the _query entry_. We can combine this with [`defineQueryOptions`](/guide/queries.md#Organizing-Queries) to have type safety and a consistent way to reference queries:

```ts
import { defineQueryOptions } from '@pinia/colada'
import { fetchItemById } from '@/api/items'
import type { Item } from '@/api/items'

export const itemDetailQuery = defineQueryOptions((id: number) => ({
  key: ['items', id],
  query: () => fetchItemById(id),
}))
```

Then you can ensure the entry and set the data:

```ts
import { useQueryCache } from '@pinia/colada'
import { itemDetailQuery } from './queries/items'

const queryCache = useQueryCache()

const queryOptions = itemDetailQuery(item.id)
queryCache.ensure(queryOptions)
queryCache.setQueryData(queryOptions.key, itemData)
```
