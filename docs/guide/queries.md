# Queries

Queries handle async state declaratively. They let you focus on the state, its async status and any eventual error. They also automatically dedupe multiple requests and cache results to create a fast user experience.

Queries are meant to **read** data. In terms of REST, for example, queries would handle `GET` requests. If you need to **write** (or mutate) data, you can use [mutations](./mutations.md).

The API to define a query is the `useQuery` composable:

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
// ---cut-start---
import { defineComponent } from 'vue'
const TodoItem = defineComponent({})
// ---cut-end---

const { data, status, queryStatus } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json()),
})
</script>

<template>
  <main>
    <div v-if="queryStatus === 'running'">
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

// TODO: link mentioned options/returns to the API doc

All queries require two properties:

- A unique `key`. It allows to reuse of any query
- A `query` function. The actual function to fetch the data (indeed, Pinia Colada does not and is not meant to provide an HTTP client and is therefore agnostic on the way that you fetch the data, the only constraint being that the query function must return a promise)

`useQuery` accepts other options to configure the query cache (for example, the `staleTime`) or when and how the query should be triggered.

Queries are automatically triggered when needed (more precisely on specific events cf // TODO: link to the relevant section), **enabling a declarative approach**. You can access the fetched data through the references returned by the composable (`data`), as well as other query state, such as its `status`, `error` and more. It also returns methods to manually trigger the query.

## Best practices

Since queries are triggered automatically by Pinia Colada, they cannot receive any parameters. Often, it's needed to use an external property like the route params or a search query. In those cases, you can directly use the `route` within the `query` function. It's important to also add the property to the `key` to ensure the query is invalidated when the property changes.

```vue twoslash
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

Behind the scenes, each different `key` will create a new query entry in the cache. Switching back to a previous key will not trigger a new request but will return the cached data. This is useful when navigating back and forth between pages.

## Reusable Queries

While `useQuery()` can be directly called in components, we often need to reuse the same query across components or even add extra properties like consuming the route via `useRoute()` or passing a _search_ text to the API request. In those scenarios, it's convenient to _define_ queries and reuse them where needed.

You might think that we could just create a regular composable for this:

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

But this implementation has a few drawbacks.

First, the ref `search` can't be shared among components (each new component instance will create a new ref).

Second, in the case where this query in used in several components, there can be a desynchronisation between the `search` ref instanciated in each component and the one used in the query's key. Indeed, the query being registered globally, the `search` ref actually used in the query key will be the one instanciated by the first component calling the query, and will consequently be scoped to this component. Therefore, if the first component is unmounted while the other still lives, the `search` ref used by the query key will not be reactive anymore, breaking the usage.

For all these reasons, Pinia Colada provides an alternative way of defining a query, through the `defineQuery` composable:

::: code-group

```ts [src/queries/todos.ts] twoslash
import { defineQuery, useQuery } from '@pinia/colada'
import { ref } from 'vue'

export const useFilteredTodos = defineQuery(() => {
  // `search` is shared by all components using this query
  const search = ref('')
  const { data, ...rest } = useQuery({
    key: ['todos', { search: search.value }],
    query: () => fetch(`/api/todos?filter=${search.value}`, { method: 'GET' }),
  })
  return {
    ...rest,
    // we can rename properties for convenience
    todoList: data,
    search,
  }
})
```

```vue [src/pages/todo-list.vue]
<script setup lang="ts">
import { useFilteredTodos } from '@/queries/todos'

const { todoList, search } = useFilteredTodos()
</script>
```

:::

The advantage of the `defineQuery` composable is that it will register globally all that is returned along to the query, giving us the possibility to create a context to the query. It's very similar to creating a store with `defineStore`, but for queries!
