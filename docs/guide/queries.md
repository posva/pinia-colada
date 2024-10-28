# Queries

Queries manage asynchronous state declaratively, allowing you to focus on the state, its status, and any potential errors. They automatically deduplicate multiple requests and cache results, enhancing user experience with faster performance.

Queries are designed to **read** data from asynchronous sources, such as handling `GET` requests in a REST API but they can be used along any function returning a Promise. For **writing** or mutating data, consider using [mutations](./mutations.md), which are better suited for those operations.

Queries can be created with `useQuery()` or [`defineQuery()`](#Reusable-Queries).

## Basic Usage

The most basic usage of Pinia Colada's queries is through `useQuery()`. This composable should feel familiar if you've used libraries like swrv or TanStack Query and should be the starting point for most of your async state management. If you want to reuse queries or better organize your code, use the [`defineQuery()`](#Reusable-Queries) below.

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
// ---cut-start---
import { defineComponent } from 'vue'
const TodoItem = defineComponent({})
// ---cut-end---

const { data, status, asyncStatus } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json()),
})
</script>

<template>
  <main>
    <div v-if="asyncStatus === 'loading'">
      Loading...
    </div>
    <div v-else-if="status === 'error'">
      Oops, an error happened...
    </div>
    <div v-else>
      <TodoItem v-for="todo in data" :key="todo.id" :todo="todo" />
    </div>
  </main>
</template>
```

All queries require two properties:

- A unique `key` that defines the query in the cache
- A `query` function that retrieves (e.g. fetches) the data

`useQuery` accepts other options to configure its behavior. You can find more about the options in the docs or explore them by using auto-completion in your editor!

What's great about queries is that they are automatically triggered **when needed**, **enabling a declarative approach that just works!** You can access the fetched data through the references returned by the composable (`data`), as well as other query state, such as its `status`, `error` and more. It also returns methods to manually trigger the query like `refresh()` and `refetch()`.

## Reusable Queries

While `useQuery()` can be directly called in components, we often need to reuse the same query across components or even add extra properties like consuming the route via `useRoute()` or passing a _search_ text to the API request. In those scenarios, it's more convenient to _define_ queries and reuse them where needed.

But why is this necessary? Can't we just create a regular composable for this?

```ts twoslash
// src/queries/todos.ts
import { useQuery } from '@pinia/colada'
import { ref } from 'vue'

export function useFilteredTodos() {
  const search = ref('')
  const query = useQuery({
    key: () => ['todos', search.value],
    query: () =>
      fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
  })
  return { search, ...query }
}
```

_Not exactly_ because we are mixing component state (`search`) with global state (`useQuery()` creates global state). There are two main issues with this approach:

- The ref `search` isn't shared among components. Each component instance creates a new ref for themselves
- If the query is reused across different components, there will be a de-synchronization between the `search` ref instantiated in each component and the one used in the query's key. Since the query is global, it's only instantiated once, and only the first `search` is used. Therefore, if we use this approach, only the changes to the `search` **of the component that first instantiated the query will take effect**.

Because of this, Pinia Colada provides an alternative way of defining a query, through the `defineQuery` composable. Simply wrap your composable with it:

::: code-group

```ts [src/queries/todos.ts] twoslash
import { defineQuery, useQuery } from '@pinia/colada'
import { ref } from 'vue'

export const useFilteredTodos = defineQuery(() => { // [!code ++]
  // `search` is shared by all components using this query
  const search = ref('')
  const { data, ...rest } = useQuery({
    key: ['todos', { search: search.value }],
    query: () => fetch(`/api/todos?filter=${search.value}`, { method: 'GET' }),
  })
  return {
    ...rest,
    // we can rename properties for convenience too
    todoList: data,
    search,
  }
}) // [!code ++]
```

```vue [src/pages/todo-list.vue]
<script setup lang="ts">
import { useFilteredTodos } from '@/queries/todos'

const { todoList, search } = useFilteredTodos()
</script>
```

:::

Consider `useFilteredTodos()` as a globally shared composable, instantiated only once. This ensures the `search` ref is shared across all components using this query, reflecting changes universally across components.

When you just want to organize your queries, you can also pass an object of options to `defineQuery()`:

```ts twoslash
// src/queries/todos.ts
import { defineQuery } from '@pinia/colada'

export const useTodos = defineQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json()),
})
```

## Using External Properties in Queries

Since queries are automatically triggered by Pinia Colada, the `query` function cannot accept parameters. However, you can directly use external properties like route params or search queries within the `query` function. To ensure proper caching, add these properties to the `key` as a function. A common example is using the `route` within the `query` function:

```vue{7-9} twoslash
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'

const route = useRoute()
const { data, status } = useQuery({
  key: () => ['contacts', route.params.id as string],
  query: () =>
    fetch(`/api/contacts/${route.params.id}`).then((res) => res.json()),
})
</script>
```

Each unique `key` generates a new query entry in the cache. When you switch back to a previously cached entry, it reuses the cached data, avoiding unnecessary network requests. This enhances your application's performance and responsiveness, making navigations feel instant ✨.

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
    console.log('Refetched!', data)
  }
})

// Pass `true` to throw if the query fails
refetch(true).catch((error) => {
  console.error('Error refetching:', error)
})
```

### When to use `refetch()` and `refresh()`

In practice, aim to use `refresh()` as much as possible because it will **reuse any loading request** and **avoid unnecessary network calls** based on `staleTime`.

Use `refetch()` when you are certain you need to refetch the data, regardless of the current status. This is useful when you want to force a new request, such as when the user explicitly requests a refresh.

## Caveat: SSR and `defineQuery()`

While `defineQuery()` looks like a [setup store](https://pinia.vuejs.org/core-concepts/#Setup-Stores) in pinia, it doesn't define a store, **the state returned is not serialized to the page**. This means that you are fully responsible for ensuring consistent values across the server and client for anything that is not returned by `useQuery()`. In short, this means that you cannot have code like this:

```ts
defineQuery(() => {
  const search = ref('')
  // ❌ different values on client and server
  if (import.meta.env.SSR) {
    search.value = fetchSomeInitialValue()
  }
  return {
    search,
    query: () =>
      fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
  }
})
```

Instead, you will need to ensure the `search` state is serialized from the server to the client. The simplest way is to move it to a store:

```ts twoslash
import { defineStore, storeToRefs } from 'pinia'
// ---cut-start---
import 'vite/client'
import { defineQuery } from '@pinia/colada'
import { ref } from 'vue'
function getInitialValue() {
  return 'initial value'
}
// ---cut-end---
// @moduleResolution: bundler

const useLocalStore = defineStore('query-search-store', () => {
  const search = ref('')
  return { search }
})

defineQuery(() => {
  const { search } = storeToRefs(useLocalStore())
  if (import.meta.env.SSR) {
    search.value = getInitialValue()
  }
  return {
    search,
    query: () =>
      fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
  }
})
```

::: tip

If you are using Nuxt, you can simply replace the `ref()` with [Nuxt's `useState()`](https://nuxt.com/docs/api/composables/use-state).

:::
