# Auto refetch

`@pinia/colada-plugin-auto-refetch` automatically refetches queries on an interval, typically when data is considered stale.

## Install

```bash
npm i @pinia/colada-plugin-auto-refetch
```

## Enable

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaAutoRefetch } from '@pinia/colada-plugin-auto-refetch'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaAutoRefetch({
      // global default (can be overridden per-query)
      autoRefetch: true,
    }),
  ],
})
```

## Configuration

You can configure auto-refetch globally (plugin option) and/or per query.

- `autoRefetch: false` disables it
- `autoRefetch: true` enables it (uses `staleTime` to schedule)
- `autoRefetch: number` uses a fixed interval in milliseconds
- `autoRefetch: (state) => boolean | number` enables/disables (or chooses an interval) based on the current query state

Per-query example:

```ts
useQuery({
  key: ['todos'],
  query: fetchTodos,
  staleTime: 10_000,
  autoRefetch: true,
})
```

::: warning SSR

This plugin schedules timers and is effectively client-only. It will not schedule refetches during SSR.

:::

## Notes

- If you set `autoRefetch: true`, also set a `staleTime`. Without a `staleTime`, there is nothing to schedule.
- If you need dynamic intervals, use the function form: `autoRefetch: (state) => state.data ? 30_000 : false`.

## Links

- API reference: [/api/plugins/auto-refetch](/api/plugins/auto-refetch/src/functions/PiniaColadaAutoRefetch.html)
- Source: https://github.com/posva/pinia-colada/tree/main/plugins/auto-refetch
