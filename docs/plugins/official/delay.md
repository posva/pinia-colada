# Delay

`@pinia/colada-plugin-delay` delays the transition of `asyncStatus` to `'loading'`.

This is useful to avoid UI flicker during refreshes (for example when you already have data and are refetching in the background).

In other words, if a query is refetching and the refetch takes less than the specified delay, `asyncStatus` will remain `'idle'` and only update to `'loading'` if the delay is exceeded.

## Install

```bash
npm i @pinia/colada-plugin-delay
```

## Enable

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaDelay } from '@pinia/colada-plugin-delay'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaDelay({
      delay: 200,
    }),
  ],
})
```

## Placeholder data

When using `placeholderData`, you can keep the previous content while the refresh happens, and only show a loading state if it takes longer than the delay.

## Configuration

You can configure the delay globally (plugin option) and/or per query.

- `delay: number` (milliseconds) delays setting `asyncStatus` to `'loading'`
- `delay: false` disables the behavior

You can also override per query:

```ts
useQuery({
  key: ['todos'],
  query: fetchTodos,
  delay: 0, // no delay for this query
})
```

## Links

- API reference: [/api/plugins/delay](/api/plugins/delay/src/functions/PiniaColadaDelay.html)
- Source: https://github.com/posva/pinia-colada/tree/main/plugins/delay
