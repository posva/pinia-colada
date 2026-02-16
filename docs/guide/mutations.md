# Mutations

Mutations allow us to trigger and track the status of an async operation meant to have side effects. While [queries](./queries.md) are meant to **read** data, mutations are meant to **write** data. In terms of REST, queries _usually_ handle `GET` requests and mutations handle `POST`, `PUT`, `PATCH`, and `DELETE` requests (without limiting you to do so).

Similarly to queries, mutations are defined with the `useMutation()` composable.

## Basic usage

A basic mutation is usually defined with a single property, `mutation`, which is a function that performs the async operation.

```vue twoslash
<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'

const {
  mutate: createTodo,
  status,
  asyncStatus,
} = useMutation({
  mutation: (todoText: string) =>
    fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: todoText }),
    }),
})

const todoText = ref('')
</script>

<template>
  <form @submit.prevent="createTodo(todoText)">
    <input v-model="todoText">
    <button :disabled="asyncStatus === 'loading'">
      Add todo
    </button>
  </form>
</template>
```

In the example above, it's worth noting that the `mutation` function has one parameter, `todoText`, which is passed to the `createTodo` function when the form is submitted. We could also directly use the `todoText.value` directly in the `mutation` function. The main advantage of defining a parameter is that it makes it available in mutation hooks, like `onSuccess` or `onError`. In general, it's a good practice to define the parameters of the mutation function. They will also get reflected on the `variables` property of the mutation.

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'

const {
  variables,
  // ^?
} = useMutation({
  mutation: (todoText: string) =>
    fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: todoText }),
    }),
})
</script>
```

## Mutations ❤️ Queries

Using mutations allows us to easily keep the changed data up to date. We have multiple strategies to do so:

- [Invalidate queries](./query-invalidation.md#Invalidation-in-Mutation-Hooks) that depend on the data that was changed.
- [Optimistic updates](./optimistic-updates.md) to update the UI before the mutation is completed.

## Reusable mutations

[Similarly to queries](../advanced/reusable-queries.md), mutations can be defined and reused across components with the `defineMutation()` function.

::: code-group

```ts [mutations/todos.ts] twoslash
// NOTE: to sync with mutations.md
// @filename: mutations/todos.ts
// ---cut-before---
import { ref } from 'vue'
import { defineMutation, useMutation } from '@pinia/colada'

export const useCreateTodo = defineMutation(() => {
  const todoText = ref('')
  const { mutate, ...mutation } = useMutation({
    mutation: (text: string) =>
      fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  })

  return {
    ...mutation,
    // we can still pass the todoText to the mutation so it appears in plugins
    // and other places
    createTodo: () => mutate(todoText.value),
    // expose the todoText ref
    todoText,
  }
})
```

```vue [components/CreateTodo.vue] twoslash
<script setup lang="ts">
import { useCreateTodo } from './mutations/todos'

const { createTodo, status, asyncStatus, todoText } = useCreateTodo()
</script>

<template>
  <form @submit.prevent="createTodo(todoText)">
    <input v-model="todoText">
    <button :disabled="asyncStatus === 'loading'">
      Add todo
    </button>
  </form>
</template>
```

:::

In the scenario above, the `todoText` is created only once and shared across all components that use the `useCreateTodo` composable.

When you just want to organize your mutations, you can also pass an object of options to `defineMutation()`:

```ts twoslash
// src/mutations/todos.ts
import { defineMutation } from '@pinia/colada'

export const useCreateTodo = defineMutation({
  mutation: (todoText: string) =>
    fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: todoText }),
    }),
})
```

## Executing mutations

Mutations expose two different methods for executing the mutation:

- `mutate`: The main method to execute the mutation. It accepts the same parameters as the mutation function and does not return anything.
- `mutateAsync`: A method that returns a promise that resolves when the mutation is completed. It accepts the same parameters as the mutation function.

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'

const {
  // hover over to inspect the types
  mutate,
  mutateAsync,
} = useMutation({
  mutation: (todoText: string) =>
    fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: todoText }),
    }),
})
</script>
```

Most of the time, using `mutate` should be easier to use as it catches any errors thrown by the mutation. On the other hand `mutateAsync` is useful when you need to handle the errors yourself or to wait for the mutation to complete.

## Mutation state

The mutation returns similar properties to queries, like `state`, `data`, `error`, `status`, `asyncStatus`, etc. However, mutations are, by default, not global.

## Hooks

### Global hooks

Global hooks like `onMutate`, `onSuccess`, `onError`, and `onSettled` can be set through `mutationOptions` when installing `PiniaColada`.

If you want to **extend** what `useMutation()` returns (e.g. add `mutatedAt`, counters, logging), this is done through the plugin system. See [Plugins](../plugins/writing-plugins.md).

## Best Practices
