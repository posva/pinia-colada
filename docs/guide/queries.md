# Queries

Queries manage asynchronous state declaratively, allowing you to focus on the state, its status, and any potential errors. They automatically deduplicate multiple requests and cache results, enhancing user experience with faster performance.

Queries are designed to **read** data from asynchronous sources, such as handling `GET` requests in a REST API but they can be used along any function returning a Promise. For **writing** or mutating data, consider using [mutations](./mutations.md), which are better suited for those operations.

Queries are created with `useQuery()`. They can be combined with [`defineQueryOptions()` for organization and typing](./query-keys.md#Typing-query-keys) or [`defineQuery()`](../advanced/reusable-queries.md) for reusability.

## Foundations

The most basic usage of Pinia Colada's queries is through `useQuery()`. This composable should feel familiar if you've used libraries like swrv or TanStack Query and should be the starting point for most of your async state management.

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
// ---cut-start---
import { defineComponent } from 'vue'
const TodoItem = defineComponent({})
// ---cut-end---

const {
  // main query properties
  state,
  asyncStatus,
  refresh,
  refetch,
  // convenient aliases
  error,
  data,
  status,
  isLoading,
  isPending,
  isPlaceholderData,
} = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json()),
})
</script>

<template>
  <main>
    <div v-if="asyncStatus === 'loading'">
      Loading...
    </div>
    <div v-else-if="state.status === 'error'">
      Oops, an error happened...
    </div>
    <div v-else-if="state.data">
      <TodoItem v-for="todo in state.data" :key="todo.id" :todo="todo" />
    </div>
  </main>
</template>
```

All queries require two properties:

- A unique `key` that defines the query in the cache
- A `query` function with no arguments that retrieves (e.g. fetches) the data

`useQuery` accepts other options to configure its behavior. You can find more about the options in the docs or explore them by using auto-completion in your editor!

What's great about queries is that they are automatically triggered **when needed**, **enabling a declarative approach that just works!**. That's why they don't take any parameters.

Most of the time you will find yourself using just `state` and `asyncStatus` to render the UI based on the query's status (e.g. is it still fetching, is it refreshing, did it throw?, ...). Let's cover the basics of these properties:

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

- `refresh()`: manually triggers the query, deduplicates requests, and reuses the cached data if it's still fresh.
- `refetch()`: manually triggers the query, ignoring the cache, and fetching the data again.
- `data`, `error`, `status`: are aliases for the properties in `state` for convenience and facilitating migration. `state` allows for [type narrowing in TypeScript](#typescript-narrowing-data-and-errors-type-with-status) but depending on your template usage, you might not need it so we simply provide both approaches for convenience.
- _For everything else, hover over the different properties in the code block above to see their types and documentation_ 😁.

## Understanding Query Status vs Async Status

One of the key features that makes Pinia Colada powerful is the distinction between **data status** (`status`) and **async status** (`asyncStatus`). Understanding this difference is crucial for building great user experiences.

### Data Status (`status`)

The `status` property tells you about the **state of your data**:

- `'pending'`: The query hasn't resolved yet (no data available)
- `'success'`: The query has successfully resolved (data is available)
- `'error'`: The query has failed (error is available, data may or may not be available)

### Async Status (`asyncStatus`)

The `asyncStatus` property tells you about the **current fetch operation**:

- `'idle'`: No fetch operation is currently in progress
- `'loading'`: A fetch operation is currently running

### Why Two Separate Statuses?

Having separate statuses enables powerful UX patterns like **"stale while revalidate"**. Consider these scenarios:

1. **Initial Load**: `status: 'pending'` + `asyncStatus: 'loading'`
2. **Data Available**: `status: 'success'` + `asyncStatus: 'idle'`
3. **Refreshing Existing Data**: `status: 'success'` + `asyncStatus: 'loading'`
4. **Background Refetch**: `status: 'success'` + `asyncStatus: 'loading'`

### Practical Examples

Here are common UI patterns you can implement:

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { state, asyncStatus, refresh } = useQuery({
  key: ['users'],
  query: () => fetch('/api/users').then((res) => res.json()),
})
</script>

<template>
  <div>
    <!-- Show initial loading spinner only when there's no data yet -->
    <div v-if="state.status === 'pending'" class="loading-spinner">
      Loading users for the first time...
    </div>

    <!-- Show error state -->
    <div v-else-if="state.status === 'error'" class="error">
      Failed to load users: {{ state.error.message }}
      <button @click="refresh()">
        Retry
      </button>
    </div>

    <!-- Show data with optional refresh indicator -->
    <div v-else-if="state.data">
      <!-- Small loading indicator when refreshing existing data -->
      <div v-if="asyncStatus === 'loading'" class="refresh-indicator">
        🔄 Refreshing...
      </div>

      <ul>
        <li v-for="user in state.data" :key="user.id">
          {{ user.name }}
        </li>
      </ul>
    </div>
  </div>
</template>
```

### Advanced UI States

You can combine both statuses for more sophisticated UX:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'

const { state, asyncStatus } = useQuery({
  key: ['products'],
  query: () => fetch('/api/products').then((res) => res.json()),
})

// Derive meaningful UI states
const uiState = computed(() => {
  if (state.value.status === 'pending' && asyncStatus.value === 'loading') {
    return 'initial-loading'
  }
  if (state.value.status === 'success' && asyncStatus.value === 'loading') {
    return 'refreshing'
  }
  if (state.value.status === 'success' && asyncStatus.value === 'idle') {
    return 'success'
  }
  if (state.value.status === 'error') {
    return 'error'
  }
  return 'idle'
})
</script>

<template>
  <div>
    <!-- Different loading states -->
    <div v-if="uiState === 'initial-loading'" class="skeleton-loader">
      <!-- Skeleton loading animation -->
    </div>

    <div v-else-if="uiState === 'refreshing'" class="with-refresh">
      <!-- Show existing data with subtle refresh indicator -->
      <ProductList :products="state.data" />
      <div class="refresh-bar">
        Updating products...
      </div>
    </div>

    <div v-else-if="uiState === 'success'">
      <ProductList :products="state.data" />
    </div>

    <div v-else-if="uiState === 'error'">
      <ErrorMessage :error="state.error" />
    </div>
  </div>
</template>
```

### When to Use Which Status

**Use `status` when you need to know about the data:**
- Deciding whether to show data, error, or loading states
- Type narrowing in TypeScript (with `state`)
- Determining if data is available for business logic

**Use `asyncStatus` when you need to know about ongoing operations:**
- Showing loading spinners or refresh indicators
- Disabling buttons during fetch operations
- Implementing optimistic UI patterns

**Use both together for advanced UX:**
- Stale-while-revalidate patterns
- Different loading states (initial vs refresh)
- Complex loading indicators

## Using External Properties in Queries

Since queries are automatically triggered by Pinia Colada, the `query` function cannot accept parameters. However, you can directly use external properties like route params or search queries within the `query` function. To ensure proper caching, add these properties to the `key` as a function. A common example is using the `route` within the `query` function:

```vue{7-9} twoslash
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'

const route = useRoute()
const { state } = useQuery({
  key: () => ['contacts', route.params.id as string],
  query: () =>
    fetch(`/api/contacts/${route.params.id}`).then((res) => res.json()),
})
</script>
```

Each unique `key` generates a new query entry in the cache. When you switch back to a previously cached entry, it reuses the cached data, avoiding unnecessary network requests. This enhances your application's performance and responsiveness, making navigations feel instant ✨.

## Organizing Queries

As your project grows and you start using more and more queries as well as concepts as [Optimistic Updates](./optimistic-updates.md), you will want to organize your queries. You can do this by using [`defineQueryOptions()`](../advanced/reusable-queries.md) and placing your query options **and their corresponding keys** in separate files:

```
./queries
├── boards.ts
├── documents.ts
└── users.ts
```

Each file can expose keys and options related to specific domain, allowing you to keep the queries logic in one place and also considerably simplify the usage of `useQuery()` in Vue components.

::: code-group

```ts twoslash [./queries/documents.ts]
import { defineQueryOptions } from '@pinia/colada'
import { getDocumentById } from '@/api/documents'

export const DOCUMENT_QUERY_KEYS = {
  root: ['documents'] as const,
  byId: (id: string) => [...DOCUMENT_QUERY_KEYS.root, id] as const,
  // reuse the keys above to keep everything consistent
  byIdWithComments: (id: string, withComments?: boolean) =>
    [...DOCUMENT_QUERY_KEYS.byId(id), { withComments }] as const,
}

export const documentByIdQuery = defineQueryOptions(
  ({ id, withComments = false }: { id: string, withComments?: boolean }) => ({
    key: DOCUMENT_QUERY_KEYS.byIdWithComments(id, withComments),
    query: () => getDocumentById(id, { withComments }),
  }),
)
```

```vue{4,7-9} twoslash [./pages/documents/[docId].vue]
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { documentByIdQuery } from '@/queries/documents'

const route = useRoute()
const { data } = useQuery(documentByIdQuery, () => ({
  id: route.params.docId as string,
}))
</script>
```

:::

You will notice that the docs use a lot `useQuery()` with simple options. This is to keep this documentation simple and focused fewer concepts. In practice, **it is recommended to use** [key factories](./query-keys.md#Managing-query-keys-key-factories-) **and** [`defineQueryOptions()`](./query-keys.md#Typing-query-keys) to keep your queries organized and type-safe.

## Pausing queries

It's possible to temporarily stop a query from refreshing, like pausing it. This has many use cases and is especially handy when you have some kind of auto refetch happening.
This is crucial when some of the data used to query is required but not always present. The most common example is using a _param_ or _query_ from the route in a query that is used across pages (e.g. within a store). Such usage will make the query trigger while not in the page, causing unnecessary network requests. It's easy to disable the query when the required data is absent:

```ts
export const useCurrentDeck = defineQuery(() => {
  const route = useRoute()
  const result = useQuery({
    key: () => ['decks', Number(route.params.deckId)],
    query: () =>
    // you might need to cast the param or suffix it with `!`
    // for TS
      fetch(`/api/decks?deckId=${route.params.deckId}`)
        .then((res) => res.json()),
    // only enable the query when we are on /decks/some-deck-id
    enabled: () => 'deckId' in route.params,
  })

  return {
    ...result,
  }
})
```

Since this query can be used in multiple components, it's important to pause it when the `deckId` is not present in the route. This way, the query won't be triggered when the `deckId` is not present, avoiding invalid network requests while keeping the data alive.

::: warning
This is also valid for any _global_ query, e.g. a query within a store. Since stores are never destroyed, the query will continuously watch the `key` and refresh when needed. Most of the time, it's a bad idea to consume a query within a store, as it will make the query _immortal_. If you need to use the data from the store, you can instead, [consume the query cache with `useQueryCache()`](../advanced/query-cache.md).
:::

## TypeScript: Narrowing `data` and `error`'s type with `status`

When using `status` to conditionally render different UI states, you can use the `state` property returned by `useQuery()` which groups the `status`, `data`, and `error` properties into a single object. This way, TypeScript can narrow down the type of `data` and `error` correctly:

```vue{19-20,24-25} twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const {
  data, // [!code --]
  status, // [!code --]
  error, // [!code --]
  state, // [!code ++]
} = useQuery({
  // ...
// ---cut-start---
  key: ['user-info'],
  query: () =>
    fetch('/api/user-info').then(
      (res) => res.json() as Promise<{ name: string }>,
    ),
// ---cut-end---
})
</script>

<template>
  <div v-if="state.status === 'pending'">
    Loading...
  </div>
  <div v-else-if="state.status === 'error'">
    <!-- ✅ error type excludes `null` -->
    Error fetching user info: {{ state.error.message }}
  </div>
  <!-- no need to check for the last possible status: 'success' -->
  <div v-else>
    <!-- ✅ data type excludes `undefined` -->
    {{ state.data.name }}
  </div>
</template>
```

::: details Why is this necessary?

This approach is necessary because in Vue we have to use `Ref` wrappers for variables, and TypeScript is not able to narrow down the type like it does with a plain object. When using `status` to conditionally render different UI states, you will notice that TypeScript is unable to narrow down the type of `data` _not being `undefined`_ when `status` is `'pending'` or `'error'`.

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
// @errors: 18047 18048

const {
  data,
  status,
  error,
} = useQuery({
  // ...
  // ---cut-start---
  key: ['user-info'],
  query: () =>
    fetch('/api/user-info').then(
      (res) => res.json() as Promise<{ name: string }>,
    ),
  // ---cut-end---
})
</script>

<template>
  <div v-if="status === 'pending'">
    Loading...
  </div>
  <div v-else-if="status === 'error'">
    Error fetching user info: {{ error.message }}
  </div>
  <!-- no need to check for the last possible status: 'success' -->
  <div v-else>
    {{ data.name }}
  </div>
</template>
```

While using a `v-if="data"` or `data!` both work and are perfectly fine, using the `state` property provides a more elegant and type-safe solution.

```vue{10-11,13-14} twoslash
<script setup lang="ts">
// ...
// ---cut-start---
import { useQuery } from '@pinia/colada'
// @errors: 18047 18048

const {
  data,
  status,
  error,
} = useQuery({
  // ...
  key: ['user-info'],
  query: () =>
    fetch('/api/user-info').then(
      (res) => res.json() as Promise<{ name: string }>,
    ),
})
// ---cut-end---
</script>

<template>
  <div v-if="status === 'pending'">
    Loading...
  </div>
  <div v-else-if="status === 'error'">
    <!-- Not type safe but valid at runtime -->
    Error fetching user info: {{ error!.message }}
  </div>
  <!-- Unnecessary check for `undefined` -->
  <div v-else-if="data">
    {{ data.name }}
  </div>
</template>
```

:::

## Refetching Queries

You can manually trigger queries using the `refetch()` and `refresh()` methods. Both return a promise, with errors caught to prevent _Uncaught Promise Rejection_ errors when used directly in the template. They both return the `state` object, which contains the `status`, `data`, and `error` properties.

```ts twoslash
// ---cut-start---
import { useQuery } from '@pinia/colada'
import { defineComponent } from 'vue'
// ---cut-end---
const {
  // ...
  refresh,
  refetch,
} = useQuery({
  // ...
  // ---cut-start---
  key: ['user-info'],
  query: async () => ({ name: 'John Doe', id: 2 }),
  // ---cut-end---
})

refetch().then(({ data, error }) => {
  if (error) {
    console.error('Last Error:', error)
  } else {
    console.log('Fetched data:', data)
  }
})

// Pass `true` to throw if the query fails
refetch(true).catch((error) => {
  console.error('Error refetching:', error)
})
```

### When to use `refetch()` and `refresh()`

In practice, aim to use `refresh()` as much as possible because it will **reuse any loading request** and **avoid unnecessary network calls** based on `staleTime`.

Use `refetch()` when you are certain you need to refetch the data, regardless of the current status. This is useful when you want to force a new request, such as when the user explicitly requests a _refresh_.
