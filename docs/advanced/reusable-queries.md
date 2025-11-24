# Reusable Queries

While `useQuery()` can be directly called in components, we often need to reuse the same query across components or even add extra properties like consuming the route via `useRoute()` or passing a _search_ text to the API request. In those scenarios, it's more convenient to _define_ queries and reuse them where needed.

<!--
TODO: show example first, move explanation after within a details.
Think about parameterized queries:
  - the query
 -->

But why is this necessary? Can't we just create a regular composable for this?

```ts twoslash
// src/queries/todos.ts
import { useQuery } from '@pinia/colada'
import { ref } from 'vue'

export function useFilteredTodos() {
  const search = ref('')
  const query = useQuery({
    key: () => ['todos', search.value],
    query: () => fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
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
  const { state, ...rest } = useQuery({
    key: () => ['todos', { search: search.value }],
    query: () => fetch(`/api/todos?filter=${search.value}`, { method: 'GET' }),
  })
  return {
    ...rest,
    // we can rename properties for convenience too
    todoList: state,
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

::: tip When to use `defineQuery()` over just `useQuery()`?

If you find yourself with the same query (same `key` value) used in multiple components that are also mounted at the same time, you **should** use `defineQuery()`. This will ensure that the query is shared among all components.

If you need to reuse a query in multiple components, move the query to a separate file (e.g. `src/queries/todos.ts`) and [use `defineQueryOptions()`](../guide/queries.md#Organizing-Queries) to define reusable options. This will ensure that the query code isn't partially updated in your code base.

If you need to define custom parameters **that aren't global**, [prefer using `defineQueryOptions`](../guide/queries.md#Organizing-Queries). You can also or write a custom composable and call `useQuery()` within it.

:::

### Nuxt

When using `defineQuery()` in Nuxt, `useRoute()` returns a different version of the route, **it is recommended to explicitly import it from `vue-router` instead of using the Nuxt version** (automatically imported):

```ts{1}
import { useRoute } from 'vue-router'

export const useContactDetails = defineQuery(() => {
  const route = useRoute()
  return useQuery({
    key: () => ['contacts', route.params.contactId],
    query: () => fetch(`/api/contacts/${route.params.contactId}`).then((res) => res.json()),
  })
})
```

If you don't do this, you will see the query being triggered more than it should, specifically when navigating to or away from the page. It might be even `undefined`. This is due to how Nuxt internally handles the integration with Suspense.

## Caveat: SSR and `defineQuery()`

While `defineQuery()` looks like a [setup store](https://pinia.vuejs.org/core-concepts/#Setup-Stores) in pinia, it doesn't define a store, **the state returned is not serialized to the page**. This means that you are fully responsible for ensuring consistent values across the server and client for anything that is not returned by `useQuery()`. In short, this means that you cannot have code like this:

```ts
defineQuery(() => {
  const search = ref('')
  // ❌ different values on client and server
  if (import.meta.env.SSR) {
    search.value = fetchSomeInitialValue()
  }
  const query = useQuery({
    key: () => ['todos', search.value],
    query: () => fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
  })
  return {
    search,
    ...query,
  }
})
```

Instead, you will need to ensure the `search` state is serialized from the server to the client. The simplest way is to move it to a store:

```ts twoslash
import { defineStore, storeToRefs } from 'pinia'
// ---cut-start---
import 'vite/client'
import { defineQuery, useQuery } from '@pinia/colada'
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
  const query = useQuery({
    key: () => ['todos', search.value],
    query: () => fetch(`/api/todos?search=${search.value}`).then((res) => res.json()),
  })
  return {
    search,
    ...query,
  }
})
```

::: tip

If you are using Nuxt, you can simply replace the `ref()` with [Nuxt's `useState()`](https://nuxt.com/docs/api/composables/use-state) instead of creating a store.

:::
