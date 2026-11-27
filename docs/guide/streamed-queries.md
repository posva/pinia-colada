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

If you change the data with `queryCache.setQueryData()` while the stream sends chunks, the next chunks are added to the new data.

::: tip

Always pass the `signal` to your requests. When the query is cancelled or fetched again, Pinia Colada ignores the next chunks and the `signal` stops the request.

:::

When the query is [cancelled](./cancelling-queries.md), `asyncStatus` becomes `'idle'`, `data` keeps the chunks received before the cancellation, and `status` does not become `'error'`.

To stream the result of an operation that changes data on the server, use [`streamedMutation()`](./streamed-mutations.md).

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

## Example: streaming an LLM response

The [AI SDK](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text.md) `streamText()` function returns a `textStream` that is an `AsyncIterable`. `streamText()` needs your provider API key, so call it in a server route and send the text to the client with `toTextStreamResponse()`. With Nuxt:

```ts [server/api/ask.post.ts]
import { defineEventHandler, readBody } from 'nuxt/server'
import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const { prompt } = await readBody<{ prompt: string }>(event)

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    prompt,
    // stops the LLM call when the client cancels the request
    abortSignal: event.req.signal,
  })

  return result.toTextStreamResponse()
})
```

In the page, read the response as text chunks and join them with a `reducer`:

```vue [pages/ask.vue]
<script setup lang="ts">
import { streamedQuery } from '@pinia/colada'

async function* askLLM(prompt: string, { signal }: { signal: AbortSignal }) {
  const body = await $fetch<ReadableStream<Uint8Array>>('/api/ask', {
    method: 'POST',
    body: { prompt },
    responseType: 'stream',
    signal,
  })

  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  while (true) {
    const { value, done } = await reader.read()
    if (done) return
    yield value
  }
}

const prompt = ref('Invent a new holiday and describe its traditions.')

const { data: answer, asyncStatus } = useQuery({
  key: () => ['ask', prompt.value],
  query: streamedQuery({
    stream: ({ signal }) => askLLM(prompt.value, { signal }),
    reducer: (text, chunk) => text + chunk,
    initialValue: '',
  }),
})
</script>

<template>
  <input v-model.lazy="prompt" />
  <p>{{ answer }}<span v-if="asyncStatus === 'loading'">…</span></p>
</template>
```

`answer` shows the text while the LLM writes it, and `asyncStatus` is `'loading'` until the answer is complete. Changing `prompt` starts a new query with a new key.

## Refetch mode

`refetchMode` sets what happens to the existing data when the query is fetched again (e.g. after `refetch()` or an invalidation):

- `'reset'` (default): removes the data and goes back to the `'pending'` status. The data fills again as chunks arrive.
- `'append'`: keeps the data and adds the new chunks to it.
- `'replace'`: keeps the data until the stream ends, then replaces it with the new data in one step. If the query is cancelled before the end, the data does not change.

```ts
useQuery({
  key: ['logs'],
  query: streamedQuery({
    stream: ({ signal }) => streamLogs({ signal }),
    refetchMode: 'append',
  }),
})
```
