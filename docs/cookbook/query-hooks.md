# Query Hooks

You might notice that `useQuery` does not support `onSuccess`, `onError`, or `onSettled` callbacks. This is intentional.

Local callbacks introduce side effects directly into the data layer and are triggered for each component using the query. This can lead to duplicated behavior and makes it harder to keep side effects separate from data logic so **they simply do not exist** in query options.

To handle side effects, you can use `watch` in the component:

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

## Global query hooks

To centralize side effect handling, use the built-in `PiniaColadaQueryHooksPlugin`.

This plugin is implemented using the same plugin mechanism described in [Plugins](../advanced/plugins.md).

You can pass a `meta` field to your query to define the error message to display globally:

```ts
useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
  meta: {
    errorMessage: 'Failed to load todos',
  },
})
```

Then configure the plugin:

```ts
import { createPiniaColada } from 'pinia-colada'
import { PiniaColadaQueryHooksPlugin } from 'pinia-colada/query-hooks'

const colada = createPiniaColada({
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError: (_, entry) => {
        if (entry.meta?.errorMessage) {
          toast.error(entry.meta.errorMessage)
        }
      },
    }),
  ],
})
```

When `meta.errorMessage` is provided, it's used directly for global error handling. This avoids relying on the structure of the error and keeps query definitions declarative.
