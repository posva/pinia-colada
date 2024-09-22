# Optimistic updates

Optimistic updates are a way to update the UI **before the mutation has completed**, optimistically assuming that the mutation will succeed. This is a way to provide a more responsive UI and a better user experience. Pinia Colada provides multiple ways to implement optimistic updates, depending on the use case.

## Via the UI

The simplest way to implement optimistic updates is to update the UI directly when the mutation is called. This is done by combining the `variables` property of the mutation and invalidating affected queries.

When a mutation lives close to the query it updates, it is possible to show the pending changes directly in the UI that displays a query:

```vue{12-18,33-35} twoslash
<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { getTodoList, createTodo } from './api/todos'

const { data: todoList } = useQuery({
  key: ['todos'],
  query: () => getTodoList()
})

const newTodoText = ref('')
const queryCache = useQueryCache()
const { mutate, isLoading, variables: newTodo } = useMutation({
  mutation: (text: string) => createTodo(text),
  async onSettled() {
    // Invalidate the query to refetch the new data
    await queryCache.invalidateQueries({ key: ['todos'] })
  },
})
</script>

<template>
  <form @submit.prevent="mutate(newTodoText)">
    <input v-model="newTodoText" :disabled="isLoading">
    <button :disabled="isLoading">
      Add todo
    </button>
  </form>

  <ul v-if="todoList">
    <li v-for="todo in todoList" :key="todo.id">
      {{ todo.text }}
    </li>
    <li v-if="isLoading">
      {{ newTodo }}
    </li>
  </ul>
</template>
```

In this example, while the mutation is loading, the new todo is displayed in the list. The `variables` property of the mutation contains the last variables passed to the mutation. It's up to you if you want to display them differently or not:

```vue-html
<li v-if="isLoading" :style="{ opacity: 0.5 }">{{ newTodo }}</li>
```

When doing this, it's important to remember to invalidate the query after the mutation has completed with `await queryCache.invalidateQueries()`. This will ensure that the query is refetched with the new data. By awaiting the invalidation, the mutation will stay on the loading state until all related queries has been refetched.

### When mutation is not collocated with the query

When the mutation is not collocated with the query it updates, you can still use the mutation state next to the query. In this case, **you must specify a key for the mutation** so it can be referenced by `useMutationState()`:

```ts twoslash
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'

const queryCache = useQueryCache()
const {
  mutate,
  isLoading,
  variables: newTodo,
} = useMutation({
  key: ['createTodo'],
  mutation: (text: string) => createTodo(text),
  onSettled: () => queryCache.invalidateQueries({ key: ['todos'] }),
})
```

Then, you can use `useMutationState()` to access the mutation state in another component:

```ts
import { useMutationState, useQuery } from '@pinia/colada'
import { getTodoList } from './api/todos'

const { data: todoList } = useQuery({
  key: ['todos'],
  query: () => getTodoList(),
})

const { isLoading, variables: newTodo } = useMutationState({
  key: ['createTodo'],
})
```

## Via the cache

If the mutation affects state being used in multiple places, it might not be convenient to update the UI directly. In this case, updating the cache directly can be a better solution. However, this also requires handling the **rollback** in case of errors.

We can achieve this by only touching the `useMutation()` code:

```ts twoslash
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo, type TodoItem } from './api/todos'

const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onMutate: (text: string) => {
    // save the current todo list
    const todoList: TodoItem[] | undefined = queryCache.getQueryData(['todos'])
    // optimistic update the cache
    queryCache.setQueryData(['todos'], [...(todoList || []), { text }])
    // return the current todo list to be used in case of errors
    return { todoList }
  },
  onError: ({ todoList }) => {
    // rollback to the previous state
    queryCache.setQueryData(['todos'], todoList)
  },
  onSettled: () => {
    // invalidate the query to refetch the new data
    queryCache.invalidateQueries({ key: ['todos'] })
  },
})
```

Note that depending on the mutation, you might want to update multiple queries, making the rollback more complex.

::: tip

The `queryCache.setQueryData()` action does not modify the `status` of the query nor cancels any ongoing queries. You can do that by manually calling the different query actions.

:::
