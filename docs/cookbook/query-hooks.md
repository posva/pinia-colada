# Query Hooks

You might notice that `useQuery` does not support `onSuccess`, `onError`, or `onSettled` callbacks. This is intentional. Local callbacks introduce side effects directly into the data layer and are triggered for each component using the query. This can lead to duplicated behavior and makes it harder to keep side effects separate from data logic so **they simply do not exist** in query options.

## Local

The simplest way is by using `watch` in the component:

```ts
const { error } = useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
})

watch(error, (e) => {
  if (e) {
    toast.error(e.message ?? 'Something went wrong')
  }
})
```

While this approach works, it can lead to duplicated code across components.

## Recommended

For global side effects, you can use the [query hooks plugin](/plugins/official/query-hooks.md) to centralize side-effect handling (toasts, logging, analytics…) with the `meta` field to keep `useQuery` declarative:

```ts
useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
  meta: {
    errorMessage: 'Failed to load todos',
  },
})
```
