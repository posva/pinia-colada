# Paginated Queries

Paginated queries are a way to retrieve a subset of the results of a query. In Pinia Colada all you need for paginated queries is to **pass the page to the `key` function**.

```vue{7,9} twoslash
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'

const route = useRoute()
const { state } = useQuery({
  key: () => ['contacts', Number(route.query.page) || 1],
  query: () =>
    fetch(`/api/contacts?page=${Number(route.query.page) || 1}`).then((res) => res.json()),
})
</script>
```

Make sure you provide a _function_ to `key` and not just a plain value. This will ensure the key is reactive and changes when the page changes.

## Keeping the old data

When navigating through pages, as the `key` updates, **a new cache entry is created**. This also means that `state.data` becomes `undefined` when navigating to a new page. To keep the old data while fetching the new one, you can use the `placeholderData` option.

```vue{10} twoslash
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'

const route = useRoute()
const { state } = useQuery({
  key: () => ['contacts', Number(route.query.page) || 1],
  query: () =>
    fetch(`/api/contacts?page=${Number(route.query.page) || 1}`).then((res) => res.json()),
  placeholderData: (previousData) => previousData,
})
</script>
```

`placeholderData` is really convenient for paginated queries because it will return the `state.status` as `success` without actually changing the cache state 💡. This also means they are not serialized during SSR. The `asyncStatus` will still be `loading` until the query resolves.

## Infinite scroll

Regular pagination with `useQuery()` still treats each page as an independent entry in the cache. They get invalidated and garbage collected individually which means they can get garbage collected and removed from the cache if they are not being currently used. When implementing infinite scroll, you might want to merge together the results of multiple pages so they can be used as one. This is where `useInfiniteQuery()` comes into play.

::: danger

`useInfiniteQuery()` is experimental and subject to change. We are looking for [feedback](https://github.com/posva/pinia-colada/issues/178) on this API and the needed use cases.

:::

::: code-group

```vue [pages/cat-facts.vue]
<script setup lang="ts">
import { factsApi } from '@/api/cat-facts'
import type { CatFacts } from '@/api/cat-facts'
import { useInfiniteQuery } from '@pinia/colada'
import { onWatcherCleanup, useTemplateRef, watch } from 'vue'

const {
  state: facts,
  loadMore,
  asyncStatus,
} = useInfiniteQuery({
  key: ['feed'],
  query: async ({ nextPage }) =>
    nextPage != null ? factsApi.get<CatFacts>({ query: { page: nextPage, limit: 10 } }) : null,
  initialPage: {
    data: new Set<string>(),
    // null for no more pages
    nextPage: 1 as number | null,
  },
  merge(pages, newFacts) {
    // no more pages
    if (!newFacts) return pages
    // ensure we have unique entries even during HMR
    const data = new Set([...pages.data, ...newFacts.data.map((d) => d.fact)])
    return {
      data,
      nextPage: newFacts.next_page_url ? newFacts.current_page + 1 : null,
    }
  },
})

const loadMoreEl = useTemplateRef('load-more')

watch(loadMoreEl, (el) => {
  if (el) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
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
  <div>
    <button :disabled="asyncStatus === 'loading'" @click="loadMore()">
      Load more (or scroll down)
    </button>
    <template v-if="facts?.data">
      <p>We have loaded {{ facts.data.data.size }} facts</p>
      <details>
        <summary>Show raw</summary>
        <pre>{{ facts }}</pre>
      </details>

      <blockquote v-for="fact in facts.data.data">
        {{ fact }}
      </blockquote>

      <p v-if="facts.data.nextPage" ref="load-more">Loading more...</p>
    </template>
  </div>
</template>
```

```ts [api/cat-facts.ts]
import { mande } from 'mande'

export interface CatFacts {
  current_page: number
  data: Array<{ fact: string; length: number }>
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export const factsApi = mande('https://catfact.ninja/facts')
```

:::
