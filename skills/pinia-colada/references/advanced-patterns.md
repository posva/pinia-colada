# Advanced Patterns

## Optimistic Updates via Cache

Full pattern: save old state → set new state → cancel queries → rollback on error → invalidate on settle.

```ts
import { useMutation, useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: patchContact,

  onMutate(contactInfo) {
    const oldContact = queryCache.getQueryData<Contact>(['contact', contactInfo.id])!
    const newContact: Contact = { ...oldContact, ...contactInfo }

    queryCache.setQueryData(['contact', newContact.id], newContact)
    queryCache.cancelQueries({ key: ['contact', newContact.id] })

    return { oldContact, newContact }
  },

  onError(err, contactInfo, { newContact, oldContact }) {
    // Only rollback if cache hasn't been updated by another mutation/query
    if (newContact === queryCache.getQueryData(['contact', contactInfo.id])) {
      queryCache.setQueryData(['contact', contactInfo.id], oldContact)
    }
  },

  onSettled(_data, _error, _vars, { newContact }) {
    if (newContact) {
      queryCache.invalidateQueries({ key: ['contact', newContact.id] })
    }
  },

  onSuccess(contact, _contactInfo, { newContact }) {
    // Progressive update with server data
    queryCache.setQueryData(['contact', newContact.id], contact)
  },
})
```

### Appending to a list

Same pattern but merge into array:

```ts
onMutate(text) {
  const oldList = queryCache.getQueryData<Todo[]>(['todos'])
  const newItem: Todo = { text, id: crypto.randomUUID() }
  const newList = [...(oldList || []), newItem]
  queryCache.setQueryData(['todos'], newList)
  queryCache.cancelQueries({ key: ['todos'] })
  return { oldList, newList, newItem }
},
onSuccess(serverItem, _vars, { newItem }) {
  const list = queryCache.getQueryData<Todo[]>(['todos']) || []
  const idx = list.findIndex(t => t.id === newItem.id)
  if (idx >= 0) {
    const copy = list.slice()
    copy.splice(idx, 1, serverItem)
    queryCache.setQueryData(['todos'], copy)
  }
},
```

## Optimistic Updates via UI

When mutation is collocated with the query, use `variables` + `isLoading`:

```vue
<script setup lang="ts">
const { data: todoList } = useQuery({ key: ['todos'], query: getTodoList })
const queryCache = useQueryCache()
const {
  mutate,
  isLoading,
  variables: newTodo,
} = useMutation({
  mutation: (text: string) => createTodo(text),
  async onSettled() {
    await queryCache.invalidateQueries({ key: ['todos'] })
  },
})
</script>

<template>
  <ul v-if="todoList">
    <li v-for="todo in todoList" :key="todo.id">{{ todo.text }}</li>
    <li v-if="isLoading" :style="{ opacity: 0.5 }">{{ newTodo }}</li>
  </ul>
</template>
```

When mutation is in a different component, add a `key` to the mutation and use `mutationCache.getEntries({ key })` to access its state elsewhere.

## Infinite Queries

All pages in ONE cache entry. Page param NOT in key. Only filters go in key.

```ts
import { useInfiniteQuery } from '@pinia/colada'

const { data, hasNextPage, loadNextPage, asyncStatus } = useInfiniteQuery({
  key: () => ['feed', { search: search.value }],
  initialPageParam: 1,
  query: ({ pageParam }) => fetch(`/api/feed?page=${pageParam}`).then((r) => r.json()),
  getNextPageParam: (lastPage) => lastPage.nextPage ?? null,
})

// data.value.pages: array of pages
// data.value.pageParams: param used for each page
```

Cursor-based:

```ts
useInfiniteQuery({
  key: ['notifications'],
  initialPageParam: null as string | null,
  query: ({ pageParam }) => api.listNotifications({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
})
```

Changing the key resets the infinite query.

## Paginated Queries

Each page = separate cache entry. Page IS part of the key. Use `placeholderData` for smooth transitions:

```ts
const page = ref(1)
const { data, isPlaceholderData } = useQuery({
  key: () => ['products', { page: page.value }],
  query: () => getProducts({ page: page.value }),
  placeholderData: (previousData) => previousData,
})
```

## Error Handling

Use `state` for TypeScript narrowing:

```vue
<div v-if="state.status === 'error'">{{ state.error.message }}</div>
<div v-else-if="state.data">{{ state.data }}</div>
```

Custom error type globally:

```ts
// types/pinia-colada.d.ts
declare module '@pinia/colada' {
  interface TypesConfig {
    defaultError: MyCustomError
  }
}
```

Global mutation error handling via `mutationOptions`:

```ts
app.use(PiniaColada, {
  mutationOptions: {
    onError(error) {
      showToast(error.message)
    },
  },
})
```

Global query error handling via `PiniaColadaQueryHooksPlugin` (see plugins reference).

### Query meta

Attach metadata to queries, accessible in plugins:

```ts
useQuery({
  ...myQuery,
  meta: { errorMessage: 'Failed to load products' },
})

// In plugin: entry.meta?.errorMessage
```

Augment types:

```ts
declare module '@pinia/colada' {
  interface TypesConfig {
    queryMeta: { errorMessage?: string }
  }
}
```

## Query Cancellation

The `query` function receives a `signal` (AbortSignal). Pass it to fetch:

```ts
useQuery({
  key: ['products'],
  query: ({ signal }) => fetch('/api/products', { signal }).then((r) => r.json()),
})
```

Cancel from cache without refetch (useful in optimistic updates):

```ts
queryCache.cancelQueries({ key: ['products'] })
```

## SSR (Custom Setup)

Serialize cache on server, hydrate on client using `devalue`:

```ts
// Server
import { serialize } from 'devalue'
import { serializeQueryCache } from '@pinia/colada'

const cacheData = serializeQueryCache(queryCache)
// Send serialize(cacheData) to client
```

```ts
// Client
import { parse } from 'devalue'
import { hydrateQueryCache } from '@pinia/colada'

hydrateQueryCache(queryCache, parse(serverData))
```

Lazy queries (don't fetch on server):

```ts
useQuery({ ...myQuery, enabled: false }) // enable on client mount
```

## Nuxt

Install the Nuxt module:

```bash
npm i @pinia/colada-nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/colada-nuxt'],
})
```

- No `await` needed. SSR is handled automatically
- Use `$fetch` in query functions (works on both server and client)
- In `defineQuery`, import `useRoute` from `vue-router` (NOT from Nuxt auto-imports)
- Configure via `colada.options.ts` in project root
