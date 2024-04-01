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

Alternatively, a query can be defined with the `defineQuery()` function, which allows you to create related properties associated with the queries.

// TODO
