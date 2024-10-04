# Query Invalidation

Query invalidation is essential for ensuring that your application displays the most up-to-date data. Pinia Colada provides multiple ways to invalidate queries, either through the cache store or mutations.

## Invalidation via Cache Store

You can invalidate queries directly using the cache store. This is useful when you need to manually trigger a refetch of data.

```ts
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()

// Invalidate a specific query
queryCache.invalidateQueries({ key: ['todos'] })

// Invalidate all queries
queryCache.invalidateQueries()
```

## Invalidation via Mutations

Mutations can automatically invalidate queries upon completion. This ensures that any data affected by the mutation is refetched.

### Basic Example

```ts
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'

const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onSettled: () => queryCache.invalidateQueries({ key: ['todos'] }),
})
```

### Optimistic Updates

Optimistic updates can also trigger query invalidation. This provides a more responsive UI by updating the cache before the mutation completes.

```ts
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'

const queryCache = useQueryCache()

const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onMutate: (text: string) => {
    const previousTodos = queryCache.getQueryData(['todos'])
    queryCache.setQueryData(['todos'], [...(previousTodos || []), { text }])
    return { previousTodos }
  },
  onError: (error, variables, context) => {
    queryCache.setQueryData(['todos'], context.previousTodos)
  },
  onSettled: () => queryCache.invalidateQueries({ key: ['todos'] }),
})
```

## Conclusion

Invalidating queries ensures that your application data remains consistent and up-to-date. Use the cache store for manual invalidation and mutations for automatic invalidation upon data changes.
