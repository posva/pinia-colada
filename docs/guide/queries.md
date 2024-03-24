# Queries

## Definition:

Queries are dependencies to an async source of data. They allow us to declaratively fetch, cache and refresh the data.

::: info
Queries are meant to **read** data. In terms of REST, for example, queries would handle `GET` requests. If you need to **write** (or mutate) data, you can use [mutations](./mutations.md).
:::

## Defining a query:

The API to define a query is the `useQuery` composable:

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, error, isFetching } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((res) => res.json())
})
</script>

<template>
  <main>
    <div v-if="isFetching">
      Loading
    </div>
    <div v-else-if="error">
      Oups, an error happened...
    </div>
    <div v-else>
      <Todo v-for="todo in data" :key="todo.id" :todo />
    </div>
  </main>
</template>
```

This composable:
- accepts an option object, which configures the key of the query, how to fetch de data, and options related to the cache and its revalidation
- returns the state of the query, which can be used in the UI, and some methods to declaratively revalidate the cache if needed

## The `defineQuery()` API:

Alternatively, a query can be defined with the `defineQuery()` function, which allows you to create related properties associated with the queries.

// TODO

## Query options and return:

// TODO: link mentioned options to the API doc

### Options:
Queries have two mandatory options:
- [`key`](./query-keys.md): the key used internally to identify the query. It can also be used to [invalidate a query](./query-invalidation.md).
- `query`: the function called to fetch the data, which **must** be async.

The other options are not required. They are related to:
- the cache: for example, the `staleTime` option, which defines the time after which the data is considered stale, or the `gcTime`, which defines the time after which an inactive query should be garbage collected.
- revalidation events: the query cache can be revalidated on specific events (component mount, window focus or reconnection). We can then, for each of these events, define whether the data should be revalidated or not, and how (refreshed or refetch, cf the 'returns' section for more details // TODO: add link).

// TODO: how to define options defaults,

### Returns:

`useQuery` returns:
- the state of the query: for example `data` (the last successful data resolved by the query) or `status` (the current state of the query)
- methods (to imperatively trigger data revalidation): `refresh` which check if the data is stale, and refetch it in that case, and `refetch`, which refetch the data regardless of the stale time.

*Nb: about revalidation methods, since `useQuery` already takes care of revalidating the data on specific events (cf the options section // TODO: add link), make sure to check them before manually using the following methods.*
