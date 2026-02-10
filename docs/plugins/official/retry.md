# Retry

`@pinia/colada-plugin-retry` retries failed **query** fetches automatically.

## Install

```bash
npm i @pinia/colada-plugin-retry
```

## Enable

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

app.use(PiniaColada, {
  plugins: [
    PiniaColadaRetry({
      // global defaults
      retry: 3,
      // delay can be a number or a function
      // delay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    }),
  ],
})
```

## Configuration

You can configure retry behavior globally (plugin option) and/or per query.

- `retry: false` disables retries
- `retry: number` retries that many times with no delay
- `retry: (failureCount, error) => boolean | number` retries based on the failure count and error. Return `true` to retry immediately, a number to retry after a delay in milliseconds, or `false` to stop retrying.

Per-query example:

```ts
useQuery({
  key: ['todos'],
  query: fetchTodos,
  retry: 0, // disable retries for this query
})
```

Or provide a custom policy:

```ts
useQuery({
  key: ['todos'],
  query: fetchTodos,
  retry: (failureCount, error) => {
    // e.g. retry network errors, but not 4xx
    return failureCount < 2 && shouldRetry(error)
  },
})
```

## Notes

- Retries stop if the query becomes inactive or disabled.
- If you trigger multiple fetches quickly, the plugin avoids retrying outdated work.

## Links

- API reference: [/api/plugins/retry](/api/plugins/retry/src/functions/PiniaColadaRetry.html)
- Source: https://github.com/posva/pinia-colada/tree/main/plugins/retry
