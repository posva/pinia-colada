# Error Handling

Queries and mutations expose `error` and `status` refs. Handle errors in the template, with hooks, or via global plugins.

## Error state in queries

`useQuery()` returns an `error` ref and a `status` ref. When a query function throws (or rejects), `status` becomes `'error'` and `error` holds the thrown value. See the [status table in Queries](./queries.md#status) for the full lifecycle.

```vue twoslash
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
// @errors: 18046

const { data, error, status } = useQuery({
  key: ['user-profile'],
  query: () => fetch('/api/profile').then((r) => r.json()),
})
</script>

<template>
  <div v-if="error">
    <p>Something went wrong: {{ error.message }}</p>
  </div>
  <div v-else-if="data">
    <p>Hello, {{ data.name }}</p>
  </div>
  <div v-else>
    <p>Loading...</p>
  </div>
</template>
```

::: tip Previous data is preserved on refetch failure
When a query refetch fails, the new `error` is set **but the previous `data` is kept**. This lets you show stale data alongside an error banner rather than replacing the entire UI.
:::

## Error state in mutations

`useMutation()` exposes the same `error` and `status` refs. The difference is how each method handles errors:

- **`mutate()`** — swallows errors. The error is set on the `error` ref and passed to `onError` hooks, but it is **not** rethrown. Use hooks to react.
- **`mutateAsync()`** — rethrows the error after running hooks. Wrap it in `try/catch`.

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'
// @errors: 18046

const { mutate, error, reset } = useMutation({
  mutation: (name: string) =>
    fetch('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
})
</script>

<template>
  <form @submit.prevent="mutate('Eduardo')">
    <div v-if="error">
      <p>{{ error.message }}</p>
      <button type="button" @click="reset()">Dismiss</button>
    </div>
    <button>Save</button>
  </form>
</template>
```

Calling `reset()` clears the mutation's error and data, returning it to its initial pending state.

## Reacting to errors with hooks

Use mutation hooks to handle errors outside the template. The `onError` hook receives the error, the variables passed to the mutation, and the context returned by `onMutate`:

```ts twoslash
import { useMutation } from '@pinia/colada'

// ---cut-start---
declare const toast: { error: (msg: string) => void }
// ---cut-end---
const { mutate } = useMutation({
  mutation: (name: string) =>
    fetch('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  onError(error, vars, context) {
    toast.error(`Failed to update name to "${vars}"`)
  },
  onSettled() {
    // Runs after both success and error
  },
})
```

The `context` argument contains whatever you returned from `onMutate`, which is useful for [rolling back optimistic updates](./optimistic-updates.md) on failure.

## Global error handling

### Mutations

Set global hooks for **all mutations** via `mutationOptions` when installing Pinia Colada:

```ts twoslash
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

// ---cut-start---
declare const toast: { error: (msg: string) => void }
// ---cut-end---
const app = createApp({})
app.use(createPinia())
app.use(PiniaColada, {
  mutationOptions: {
    onError(error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        // somebody threw something that isn't an Error
        console.error('Unexpected error:', error)
      }
    },
  },
})
```

::: tip Avoid toast on every mutation error

A global handler shouldn't show a toast for every failure. Filter by error type or use a less noisy UI (e.g. a status bar).

:::

### Queries

`PiniaColadaQueryHooksPlugin` gives you global query error hooks. `onError` receives the error and entry, so you can read `entry.meta` for per-query context:

```ts twoslash
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

// ---cut-start---
declare const toast: { error: (msg: string) => void }
// ---cut-end---
const app = createApp({})
app.use(createPinia())
app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError(_error, entry) {
        if (entry.meta?.errorMessage) {
          toast.error(entry.meta.errorMessage as string)
        }
      },
    }),
  ],
})
```

Then in your queries, keep things declarative with `meta`:

```ts
useQuery({
  key: ['todos'],
  query: () => fetchTodos(),
  meta: {
    errorMessage: 'Failed to load the todo list',
  },
})
```

See the [Query Hooks plugin](../plugins/official/query-hooks.md) for the full API and [Writing Plugins](../plugins/writing-plugins.md) if you need lower-level access.

## Handling non-throwing API errors

Some APIs (like `fetch` or typed API clients) don't throw on non-2xx responses — they return a response with a status code. Pinia Colada only treats **thrown or rejected** values as errors. Options:

### Throw in the query function

Check the response and throw explicitly.

```ts twoslash
import { useQuery } from '@pinia/colada'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const { data, error } = useQuery({
  key: ['todos'],
  query: async () => {
    const response = await fetch('/api/todos')
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText)
    }
    return response.json()
  },
})
```

### Keep errors in data

Keep the full response in `data` and check the status in your template. This fits typed API clients (ts-rest, oRPC) with error shapes:

```ts
const { data } = useQuery({
  key: ['todos'],
  query: async () => {
    const result = await typedApi.getTodos()
    // result.status is 200 | 404 | 500, etc.
    return result
  },
})
```

```vue-html
<template>
  <div v-if="data?.status === 200">
    {{ data.body }}
  </div>
  <div v-else-if="data">
    Unexpected status: {{ data.status }}
  </div>
</template>
```

### Intercept with a plugin

Or intercept `setEntryState` in a plugin and convert non-OK responses into error states:

```ts twoslash
// plugin-api-errors.ts
import type { PiniaColadaPlugin } from '@pinia/colada'
// ---cut-start---
function isApiError(data: unknown): data is { status: number } {
  return (
    !!data &&
    typeof data === 'object' &&
    'status' in data &&
    typeof data.status === 'number' &&
    data.status >= 400
  )
}
// ---cut-end---

export const PiniaColadaApiErrorPlugin: PiniaColadaPlugin = ({ queryCache }) => {
  queryCache.$onAction(({ name, args, after }) => {
    if (name === 'setEntryState') {
      after(() => {
        const entry = args[0]
        const state = entry.state.value
        if (state.status === 'success' && isApiError(state.data)) {
          entry.state.value = {
            status: 'error',
            error: new Error(`API error: ${state.data.status}`),
            data: state.data,
          }
        }
      })
    }
  })
}
```

## Retrying failed queries

The [Retry plugin](../plugins/official/retry.md) adds automatic retries with configurable count, delay, and filtering by error type. It can retry failed queries before surfacing errors.

## Typing errors

### Default error type

By default, all errors are typed as `Error` (via the `ErrorDefault` type). You can change this globally by augmenting the `TypesConfig` interface:

```ts twoslash
import '@pinia/colada'

export interface MyCustomError extends Error {
  code: number
}

declare module '@pinia/colada' {
  interface TypesConfig {
    defaultError: MyCustomError
  }
}
```

After this, `error` is typed as `MyCustomError` unless overridden locally.

::: tip Strict error handling
Set `defaultError` to `unknown` to force explicit narrowing.
:::

### Narrowing with `status`

The `state` returned by `useQuery()` and `useMutation()` is a discriminated union on `status`. Checking `status` narrows `error` automatically:

```ts twoslash
import { useQuery } from '@pinia/colada'
// @errors: 18046

const { state } = useQuery({
  key: ['todos'],
  query: () => fetch('/api/todos').then((r) => r.json()),
})

const current = state.value
if (current.status === 'error') {
  // current.error is narrowed to `ErrorDefault` (Error by default)
  console.error(current.error.message)
}
```

### Local narrowing with `instanceof`

Errors can't be typed per-query. Narrow them in code and keep a catch-all branch:

```vue-html
<template>
  <ForbiddenError v-if="error instanceof AuthError" :error="error" />
  <div v-else-if="error">{{ error.message }}</div>
</template>
```
