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

As we can see, to define a query, we need at least:
- a key: it will be used to store and retrieve the query
- the query function: the actual function to fetch the data (indeed, Pinia Colada does not and is not meant to provide an HTTP client, and is therefore agnostic on the way that you fetch the data, the only constraint being that the query function returns a promise)
`useQuery` accepts other options, which are not required, to configure the query cache (for example, the `staleTime`) or when and how the query should be triggered.

Then, the query will be automatically triggered when needed (more precisely on specific events cf // TODO: link to the relevant section), either to fetch or to refresh the data, enabling a declarative approach. You can access to the fetched data through the references returned by the composable (`data`), as well as to more information on the query state, such as its status (`status`). It also returns methods to manually trigger the query if needed.

## The `defineQuery()` API:

Alternatively, a query can be defined with the `defineQuery()` function, which allows you to create related properties associated with the queries. This is particularily usefull if we need to share a query between components.

Let's take an example, where we have a query depending on a search param. Let's assume we want to abstract a query into a composable:

```ts twoslash
import { useQuery } from '@pinia/colada'
import { ref } from 'vue'

export const useSearchedTodos = () => {
  const search = ref('')
  const query = useQuery({
    key: () => ['todos', search.value],
    query: () =>
      fetch(`/api/todos?search=${search.value}`, { method: 'GET' }),
  })
  return { search, ...query }
}
```

This implementation presents couple of drawbacks.

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
