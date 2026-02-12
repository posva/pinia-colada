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

Regular pagination with `useQuery()` treats each page as an independent cache entry. For infinite scrolling / “load more”, you typically want to merge pages into a single cache entry.

Use `useInfiniteQuery()` for that. See [Infinite Queries](./infinite-queries.md) for more details.
