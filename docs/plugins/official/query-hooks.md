# Query Hooks

`PiniaColadaQueryHooksPlugin` centralizes side-effect handling (toasts, logging, analytics…).

## Install

This plugin is built-in, so you don't have to install it separately.

## Enable

```ts
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      // ...
    }),
  ],
})
```

### Keep `useQuery` declarative

To decouple side effects from data logic, a common pattern is to keep queries declarative and pass a `meta` field:

```ts
useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
  meta: {
    errorMessage: 'Failed to load todos',
  },
})
```

Then configure the plugin once to use the `meta.errorMessage` for global error handling:

```ts
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError: (_error, entry) => {
        if (entry.meta?.errorMessage) {
          toast.error(entry.meta.errorMessage)
        }
      },
    }),
  ],
})
```

## Configuration

You can only configure the plugin globally, not per query:

- `onError`: called when a query fails.
- `onSuccess`: called when a query succeeds.
- `onSettled`: called when a query settles, regardless of the outcome.

## Links

- API reference: [/api](/api/@pinia/colada/functions/PiniaColadaQueryHooksPlugin.html)
