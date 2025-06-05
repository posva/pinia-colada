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
