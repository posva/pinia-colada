# Infinite Queries

Infinite queries let you load and merge multiple pages into a **single cache entry**.

::: warning Experimental

`useInfiniteQuery()` is currently marked as experimental. Expect some API/behavior changes as it evolves.

:::

This is different from paginated queries with `useQuery()` where each page is a separate cache entry (page is part of the `key`).

If you haven’t read it yet, start with [Paginated Queries](./paginated-queries.md).

## When to use

`useInfiniteQuery()` isn't for every use case. It’s ideal when:

- you want infinite scrolling / "load more" behavior (most common)
- you want all loaded pages to be invalidated/refetched as one unit
- you don't want pages to be garbage-collected independently

## Key design

With infinite queries, **the page/cursor is not part of the query key**.

Put _filters_ in the key (search text, sort order, user id…), but not the `pageParam`:

```ts
useInfiniteQuery({
  key: () => ['feed', { search: search.value }],
  // ...
})
```

Changing the key resets the infinite query as it creates a new cache entry.

## Page-based example

```ts
import { useInfiniteQuery } from '@pinia/colada'

const {
  data,
  asyncStatus,
  hasNextPage,
  loadNextPage,
} = useInfiniteQuery({
  key: ['feed'],
  initialPageParam: 1,
  query: ({ pageParam }) => fetch(`/api/feed?page=${pageParam}`).then(r => r.json()),
  getNextPageParam: (lastPage) => lastPage.nextPage ?? null,
})
```

The result is shaped like:

- `data.value.pages`: array of pages
- `data.value.pageParams`: the associated params used to fetch each page

Each time you call `loadNextPage()`, the new page is merged into the same cache entry as the key is the same.

To make it work, you must define how to get the next page param with `getNextPageParam` (or `getPreviousPageParam` for backward pagination). In this example, we use the key `nextPage` from the latest response.

So, the API returns something like:

```json
{
  "items": [/* page items */],
  "nextPage": 2
}
```

When `nextPage` is `null`, `hasNextPage` becomes `false` and `loadNextPage()` does nothing.

## Cursor-based example

If your API returns a cursor, you can use that as the page param instead of a page number:

```ts
useInfiniteQuery({
  key: ['notifications'],
  initialPageParam: null as string | null,
  query: ({ pageParam }) => api.listNotifications({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
})
```

## Load more example

You may want a feed-like behavior where you load more items as the user scrolls down. This can be achieved using an `InersectionObserver` that triggers `loadNextPage()` when the user scrolls near the bottom of the list.

```vue twoslash
<script setup lang="ts">
import { useInfiniteQuery } from '@pinia/colada'

const {
  data: facts,
  loadNextPage,
  hasNextPage,
} = useInfiniteQuery({
  key: ['feed'],
  query: async ({ pageParam }) => fetch(`/api/feed?page=${pageParam}&limit=10`).then(r => r.json()),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => (lastPage.next_page_url ? lastPage.current_page + 1 : null),
})

const loadMoreTrigger = useTemplateRef('loadMoreTrigger')

watch(loadMoreTrigger, (el) => {
  if (el) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextPage()
        }
      },
      {
        rootMargin: '300px',
        threshold: [0],
      },
    )
    observer.observe(el)
    onWatcherCleanup(() => {
      observer.disconnect()
    })
  }
})
</script>

<template>
  <ul>
    <li v-for="item in data.pages.flatMap(page => page.items)" :key="item.id">
      {{ item.text }}
    </li>
  </ul>
  <div ref="loadMoreTrigger" v-if="hasNextPage">Loading more...</div>
</template>
```

## Limiting memory with `maxPages`

For very long feeds (or chat-like UIs), you can keep only a fixed number of pages in memory:

```ts
useInfiniteQuery({
  key: ['chat', conversationId],
  initialPageParam: 1,
  maxPages: 10,
  // ...
})
```

This will keep only the 10 most recent pages in memory. When a new page is loaded, the oldest page is removed from the cache.

## Invalidation and refetch

Invalidating the infinite query invalidates the **whole entry**. Refetching will refetch the loaded pages.

## SSR

SSR works like any other query: the infinite query is serialized as one entry. Typically you’ll prefetch the initial page, and optionally load more pages server-side if your UI requires it.
