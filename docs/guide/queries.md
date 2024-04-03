# Queries

Queries handle async state declaratively. They let you focus on the state, its async status and any eventual error. They also automatically dedupe multiple requests and cache results to create a fast user experience.

Queries are meant to **read** data. In terms of REST, for example, queries would handle `GET` requests. If you need to **write** (or mutate) data, you can use [mutations](./mutations.md).

The API to define a query is the `useQuery` composable:

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, status } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json())
})
</script>

<template>
  <main>
    <div v-if="status.isLoading">
      Loading
    </div>
    <div v-else-if="status.error">
      Oops, an error happened...
    </div>
    <div v-else>
      <TodoItem v-for="todo in data" :key="todo.id" :todo />
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
      fetch(`/api/todos?search=${search.value}`, { method: 'GET' }),
  })
  return { search, ...query }
}
```

But this implementation has a few drawbacks.

First, the ref `search` can't be shared among components (each new component instance will create a new ref).

Second, in the case where this query in used in several components, there can be a desynchronisation between the `search` ref instanciated in each component and the one used in the query's key. Indeed, the query being registered globally, the `search` ref actually used in the query key will be the one instanciated by the first component calling the query, and will consequently be scoped to this component. Therefore, if the first component is unmounted while the other still lives, the `search` ref used by the query key will not be reactive anymore, breaking the usage.

For all these reasons, Pinia Colada provides an alternative way of defining a query, through the `defineQuery` composable:

```vue
<script setup lang="ts">
import { defineQuery, useQuery } from '@pinia/colada'
import { ref } from 'vue'

const searchedTodos = defineQuery(() => {
    const search = ref('')
    const { data, ...rest } = useQuery({
     key: ['todos', { search: search.value }],
      query: () =>
        fetch(`/api/todos?filter=${search.value}`, { method: 'GET' }),
    })
    return { ...rest, todoList: data, search }
})
</script>
 ```
The advantage of the `defineQuery` composable is that it will register globally all that is returned along to the query, giving us the possibility to create a context to the query.
