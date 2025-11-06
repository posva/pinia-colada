# Query Invalidation

Query invalidation is crucial for maintaining up-to-date data in your application. Typically, you should invalidate queries following mutations to ensure the cache stays synchronized with the server. However, you can also manually invalidate queries using the [Query Cache](../advanced/query-cache.md). Let's cover both methods.

## Invalidation via the Query Cache

You can directly invalidate queries using the query cache. This marks matching queries as stale, prompting a refetch if it's active (i.e., currently used by a component). You can filter queries by `key`, `status`, `active`, and more.

```ts twoslash
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()

// Invalidate a specific query and its children
queryCache.invalidateQueries({ key: ['todos'] })
// Invalidate a specific query only
queryCache.invalidateQueries({ key: ['todos'], exact: true })

// Refetch all active queries
queryCache.invalidateQueries()
```

You can also use a `predicate` function for custom filtering logic. It receives a query entry and returns a boolean indicating whether the query should be invalidated:

```ts
queryCache.invalidateQueries({
  // Invalidate queries that key starts with `users` or `todos`
  predicate: (entry) => entry.key[0] === 'users' || entry.key[0] === 'todos',
})
```

By default, `invalidateQueries()` invalidates all queries (both active and inactive) but only refetches active queries. Inactive queries are marked as stale and will be refetched when they become active again. You can change this behavior by passing a second parameter to refetch all queries:

```ts
queryCache.invalidateQueries({ key: ['todos'] }, 'all')
```

::: info

The `useQueryCache` composable grants access to the query cache. It can be used within your components' setup function and other contexts where `inject()` is available, such as Pinia Stores and Router navigation guards. Note that it cannot be invoked in the global scope or within a component method.

:::

## Invalidation in Mutation Hooks

When we mutate a resource, we can be sure that the data has changed. This is a good time to invalidate queries that depend on that resource. You can use the `onSettled` callback to invalidate queries after the mutation completes. This ensures that the cache is updated with the latest data.

```vue twoslash
<script lang="ts" setup>
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'

const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onSettled: () => {
    queryCache.invalidateQueries({ key: ['todos'], exact: true })
  },
})
</script>
```

### To `await` or not to `await`

In mutations, it's possible to `await` (or return a promise) within the different hooks. This will effectively delay the resolution or rejection of the mutation and its `asyncStatus`:

```ts
const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onSettled: async () =>
    // The mutation will resolve/reject after the related queries have been fetched again
    await queryCache.invalidateQueries({ key: ['todos'], exact: true }),
})
```

This allows you to display a loading state until the queries are refetched.

### Optimistic Updates

You can also combine query invalidation with optimistic updates like this:

```ts
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'

const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onMutate: (text: string) => {
    const previousTodos = queryCache.getQueryData(['todos'])
    queryCache.setQueryData(['todos'], [...(previousTodos || []), { text }])
    // return anything you want to reuse in other hooks
    return { previousTodos }
  },
  onError: (error, variables, { previousTodos }) => {
    // rollback to the previous state
    queryCache.setQueryData(['todos'], previousTodos)
  },
  onSettled: () => {
    // invalidate the query to refetch the new data
    queryCache.invalidateQueries({ key: ['todos'] })
  },
})
```

Optimistic Updates enhance user experience by immediately reflecting changes in the UI before the mutation completes. However, they require additional handling for potential errors. For more details, refer to the [Optimistic Updates](./optimistic-updates.md) guide.
