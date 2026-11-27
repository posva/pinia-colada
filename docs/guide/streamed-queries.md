# Streamed Queries

Some APIs send data in chunks: AI chat responses, Server-Sent Events, logs, or NDJSON files. `streamedQuery()` creates a `query` function that reads an [`AsyncIterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator) and updates the query data **on each chunk**. You do not have to wait for the stream to end.

```ts
import { streamedQuery, useQuery } from '@pinia/colada'

const { data, status, asyncStatus } = useQuery({
  key: ['chat', chatId],
  query: streamedQuery({
    stream: ({ signal }) => fetchChatMessages(chatId, { signal }),
  }),
})
```

`stream` gets the same context as a `query` function (`signal`, `entry`, `queryCache`). It returns an `AsyncIterable`, for example an async generator:

```ts
async function* fetchChatMessages(chatId: string, { signal }: { signal: AbortSignal }) {
  const response = await fetch(`/api/chat/${chatId}`, { signal })
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()

  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    yield value
  }
}
```

While the stream sends chunks:

- `data` is an array with all the chunks received so far
- `status` becomes `'success'` after the first chunk
- `asyncStatus` stays `'loading'` until the stream ends

If the stream throws an error, `status` becomes `'error'` and `data` keeps the chunks received before the error.

::: tip

Always pass the `signal` to your requests. When the query is cancelled or fetched again, Pinia Colada ignores the next chunks and the `signal` stops the request.

:::

## Custom reducer

By default, each chunk is added at the end of an array. Use `reducer` and `initialValue` to merge chunks differently. For example, to join text chunks into one string:

```ts
const { data: answer } = useQuery({
  key: ['answer', questionId],
  query: streamedQuery({
    stream: ({ signal }) => streamAnswer(questionId, { signal }),
    reducer: (text, chunk) => text + chunk,
    initialValue: '',
  }),
})
```

The `reducer` must not mutate its first argument. Return a new value instead.

## Refetch mode

`refetchMode` sets what happens to the existing data when the query is fetched again (e.g. after `refetch()` or an invalidation):

- `'reset'` (default): removes the data and goes back to the `'pending'` status. The data fills again as chunks arrive.
- `'append'`: keeps the data and adds the new chunks to it.
- `'replace'`: keeps the data until the stream ends, then replaces it with the new data in one step.

```ts
useQuery({
  key: ['logs'],
  query: streamedQuery({
    stream: ({ signal }) => streamLogs({ signal }),
    refetchMode: 'append',
  }),
})
```
