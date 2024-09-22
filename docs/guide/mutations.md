# Mutations

Mutations allow us to trigger and track the status of an async operation meant to have side effects. While [queries](./queries.md) are meant to **read** data, mutations are meant to **write** data. In terms of REST, queries handle `GET` requests and mutations handle `POST`, `PUT`, `PATCH`, and `DELETE` requests (without limiting you to do so).

Similarly to queries, mutations are defined with the `useMutation()` composable:

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import { ref } from 'vue'

const { mutate, status, asyncStatus } = useMutation({
  mutation: (todoText: string) =>
    fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ text: todoText }),
    }),
})

const todoText = ref('')
function createTodo() {
  mutate(todoText.value)
}
</script>

<template>
  <form @submit.prevent="createTodo()">
    <input v-model="todoText">
    <button :disabled="asyncStatus === 'loading'">
      Add todo
    </button>
  </form>
</template>
```

Alternatively, they can be defined with the `defineMutation()` function, which allows you to create related properties (like the `todoText` above) associated with the mutation:

::: code-group

```ts [mutations/todos.ts] twoslash
import { defineMutation, useMutation } from '@pinia/colada'
// @filename: mutations/todos.ts
// ---cut-before---
// NOTE: to sync with mutations.md
import { ref } from 'vue'

export const useCreateTodo = defineMutation(() => {
  const todoText = ref('')
  const mutation = useMutation({
    mutation: () =>
      fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text: todoText.value }),
      }),
  })

  return {
    ...mutation,
    createTodo: mutation.mutate,
    // expose the todoText ref
    todoText,
  }
})
```

```vue [components/CreateTodo.vue] twoslash
<script setup lang="ts">
import { ref } from 'vue'
import { useCreateTodo } from './mutations/todos'

const { createTodo, status, asyncStatus } = useCreateTodo()
// FIXME: should be part of useCreateTodo
const todoText = ref('')
</script>

<template>
  <form @submit.prevent="() => {}">
    <input v-model="todoText">
    <button :disabled="asyncStatus === 'loading'">
      Add todo
    </button>
  </form>
</template>
```

:::

TODO:

- Executing mutations
- Status of mutations
- Side effects
  - note about invalidating queries
  - Optimistic updates
- Global options

## Best Practices
