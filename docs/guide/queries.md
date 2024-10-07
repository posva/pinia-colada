# Queries

Queries handle async state declaratively. They let you focus on the state, its async status and any eventual error. They also automatically dedupe multiple requests and cache results to create a fast user experience.

Queries are meant to **read** data. In terms of REST, for example, queries would handle `GET` requests. If you need to **write** (or mutate) data, use [mutations](./mutations.md).

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

Think of `useFilteredTodos()` as a global shared composable that is only instantiated once. This way, the `search` ref is shared among all components using this query, and changes to it will be reflected in all components.

## Best practices

Since queries are triggered automatically by Pinia Colada, the `query` function cannot receive any parameter. Often, it's needed to use an external property like the route params or a search query. In those cases, **you can directly use the property within `query`**, and you also need to add the properties to the `key` **as a function** to ensure proper caching. The most common example is using the `route` within the `query` function:

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

Behind the scenes, each different `key` will create a new query entry in the cache. Switching back to a previous key will often avoid triggering a new request by reusing the cached data. This makes your Application feel faster and more responsive by avoiding unnecessary network requests and making navigations instant ✨.

### TypeScript

#### Narrowing the type of `data`

When using `status` to conditionally render different UI states, you will notice that TypeScript is unable to narrow down the type of `data` _not being `undefined`_ when `status` is `'pending'` or `'error'`. This is because in Vue we have to use `Ref` wrappers for variables and TS is not able to narrow down the type with `v-if`:

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
  <div v-else-if="status === 'success'">
    {{ data.name }}
  </div>
</template>
```

While using a `v-if` or the `!` operator both work and are perfectly fine, you can also use the `state` property returned by `useQuery()` which groups the `status`, `data`, and `error` properties into a single object. This way, TypeScript can narrow down the type of `data` and `error` correctly:

```vue{19-20,23-24} twoslash
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
  <div v-else>
    <!-- ✅ data type excludes `undefined` -->
    {{ state.data.name }}
  </div>
</template>
```

### Server-side rendering (SSR)

Most of the time, you won't need to worry much about it since Pinia handles it for you. But if you find yourself with rendering mismatches when using `defineQuery()` in SSR, this section is for you.

While `defineQuery()` look like Setup Stores in pinia, they are not stores, **their state is not serialized to the page**. This means that you are fully responsible for ensuring consistent values across the server and client for anything that is not returned by `useQuery()`. In short, this means that you cannot have code like this:

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

If you are using Nuxt, you can use [Nuxt's `useState()`](https://nuxt.com/docs/api/composables/use-state). Otherwise, you can simply move the `search` property into a store:

```ts
import { defineStore, storeToRefs } from 'pinia'

const useLocalStore = defineStore('query-search-store', () => {
  const search = ref('')
  return { search }
})

defineQuery(() => {
  const { search } = storeToRefs(useLocalStore())
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
