# Streamed Mutations

Some operations send their result in chunks, for example an import job that sends its progress, or a server that generates a document and sends it part by part. `streamedMutation()` creates a `mutation` function that reads an [`AsyncIterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator) and updates the mutation data **on each chunk**. It works like [`streamedQuery()`](./streamed-queries.md).

```ts
import { streamedMutation, useMutation, useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()

const { mutate, data: events } = useMutation({
  mutation: streamedMutation({
    stream: (file: File, { signal }) => importContacts(file, { signal }),
  }),
  onSettled: () => queryCache.invalidateQueries({ key: ['contacts'] }),
})
```

`stream` gets the variables passed to `mutate()` and the mutation context (`signal`, `entry`, `mutationCache`). Pass the `signal` to your requests to stop the stream when the mutation is cancelled. It returns an `AsyncIterable`, for example an async generator.

While the stream sends chunks:

- `data` is an array with all the chunks received so far
- `status` becomes `'success'` after the first chunk
- `asyncStatus` stays `'loading'` until the stream ends
- `onSuccess()` runs, and `mutateAsync()` resolves, only when the stream ends

If the stream throws an error, `status` becomes `'error'` and `data` keeps the chunks received before the error.

::: tip Query or mutation?

Use a mutation only when the operation changes data on the server. An answer to a question, e.g. an AI chat, does not change data: use [`streamedQuery()`](./streamed-queries.md) instead, so that the answer is cached and shared with all components.

:::

## Custom reducer

By default, each chunk is added at the end of an array. Use `reducer` and `initialValue` to merge chunks differently. For example, to keep only the last progress value:

```ts
const { mutate, data: progress } = useMutation({
  mutation: streamedMutation({
    stream: (file: File, { signal }) => importContacts(file, { signal }),
    reducer: (_percent, chunk) => chunk.percent,
    initialValue: 0,
  }),
})
```

The `reducer` must not mutate its first argument. Return a new value instead.

## Differences with streamed queries

- There is no `refetchMode`. Each call of `mutate()` starts again from `initialValue`.
- Mutations are not cancelled when a new call starts. Call [`mutationCache.cancel(entry)`](./mutations.md#cancelling-mutations) to stop a stream.
- A cancelled mutation stream fails: `status` becomes `'error'`, `onError()` runs, and `data` keeps the chunks received before the cancellation. A cancelled query stream does not fail.
