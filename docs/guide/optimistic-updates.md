# Optimistic updates

Optimistic updates are a way to update the UI **before the mutation has completed**, optimistically assuming that the mutation will succeed. This is a way to provide a more responsive UI and a better user experience. Pinia Colada provides multiple ways to implement optimistic updates, depending on the use case.

## Via the cache

Updating the cache directly is the most efficient way to implement optimistic updates because you are collocating the optimistic update with the mutation itself. Since you are touching the cache directly, any query relying on the updated data will automatically reflect the changes. However, this also requires handling the **rollback** in case of errors.

Here is a **complete example** of an optimistic update for the details of a contact:

```ts twoslash
import { useMutation, useQueryCache } from '@pinia/colada'
import { patchContact } from '@/api/contacts'
import type { Contact } from '@/api/contacts'

const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: patchContact,
  // `contactInfo` type is inferred from the mutation function
  onMutate(contactInfo) {
    // get the current contact from the cache, we assume it exists
    const oldContact = queryCache.getQueryData<Contact>(['contact', contactInfo.id])!
    const newContact: Contact = {
      // we merge both objects to have a complete contact
      ...oldContact,
      ...contactInfo,
    }

    // update the cache with the new contact
    queryCache.setQueryData(['contact', newContact.id], newContact)
    // we cancel (without refetching) all queries that depend on the contact
    queryCache.cancelQueries({ key: ['contact', newContact.id] })

    // pass the old and new contact to the other hooks
    return { oldContact, newContact }
  },

  // on both error and success
  onSettled(_data, _error, _vars, { newContact }) {
    // `newContact` can be undefined if the `onMutate` hook fails
    if (newContact) {
      // invalidate the query to refetch the new data
      queryCache.invalidateQueries({ key: ['contact', newContact.id] })
    }
  },

  onError(err, contactInfo, { newContact, oldContact }) {
    // before applying the rollback, we need to check if the value in the cache
    // is the same because the cache could have been updated by another mutation
    // or query
    if (newContact === queryCache.getQueryData(['contact', contactInfo.id])) {
      queryCache.setQueryData(['contact', contactInfo.id], oldContact)
    }

    // handle the error
    console.error(`An error occurred when updating a contact "${contactInfo.id}"`, err)
  },

  // Depending on your code, this `onSuccess` hook might not be necessary
  onSuccess(contact, _contactInfo, { newContact }) {
    // update the contact with the information from the server
    // since we are invalidating queries, this allows us to progressively
    queryCache.setQueryData(['contact', newContact.id], contact)
  },
})
```

Here is a **complete example** of an optimistic update of a list of todos when creating a new todo item:

```ts twoslash
import { useMutation, useQueryCache } from '@pinia/colada'
import { createTodo } from './api/todos'
import type { TodoItem } from './api/todos'

const queryCache = useQueryCache()
const { mutate } = useMutation({
  mutation: (text: string) => createTodo(text),
  onMutate(text) {
    // save the current todo list
    const oldTodoList = queryCache.getQueryData<TodoItem[]>(['todos'])
    // keep track of the new todo item
    const newTodoItem: TodoItem = {
      text,
      // we need to fill every required field
      id: crypto.randomUUID(),
    }
    // create a copy of the current todo list with the new todo
    const newTodoList: TodoItem[] = [
      ...(oldTodoList || []),
      newTodoItem,
    ]
    // update the cache with the new todo list
    queryCache.setQueryData(['todos'], newTodoList)
    // we cancel (without refetching) all queries that depend on the todo list
    // to prevent them from updating the cache with an outdated value
    queryCache.cancelQueries({ key: ['todos'] })

    // pass the old and new todo list to the other hooks
    // to handle rollbacks
    return { newTodoList, oldTodoList, newTodoItem }
  },

  // on both error and success
  onSettled() {
    // invalidate the query to refetch the new data
    queryCache.invalidateQueries({ key: ['todos'] })
  },

  onError(err, _title, { oldTodoList, newTodoList }) {
    // before applying the rollback, we need to check if the value in the cache is the same
    // because the cache could have been updated by another mutation or query
    if (newTodoList === queryCache.getQueryData(['todos'])) {
      queryCache.setQueryData(['todos'], oldTodoList)
    }

    // handle the error
    console.error('An error occurred when creating a todo:', err)
  },

  onSuccess(todoItem, _vars, { newTodoItem }) {
    // update the todo with the information from the server
    // since we are invalidating queries, this allows us to progressively
    // update the todo list even if the user is submitting multiple mutations
    // successively
    const todoList = queryCache.getQueryData<TodoItem[]>(['todos']) || []
    // find the todo we added in `onMutate()` and replace it with the one from the server
    const todoIndex = todoList.findIndex((t) => t.id === newTodoItem.id)
    if (todoIndex >= 0) {
      // Replace the whole array to trigger a reactivity update
      // we could also use `.toSpliced()` in modern environments
      const copy = todoList.slice()
      copy.splice(todoIndex, 1, todoItem)
      queryCache.setQueryData(['todos'], copy)
    }
  },
})
```

As you see, depending on the mutation, you might need to update multiple queries in different ways. Optimistic updates are a very powerful tool, but they also require more care to handle errors and edge cases. Because of this, Pinia Colada provides a low level API to cater to all use cases!

::: tip Type Safety

In large projects, you might face two issues:

- `key` isn't typed, so it's very easy to have a typo in a query key: _was it **todos** or **todo**?_
- You have to manually pass a type parameter (here `TodoItem[]`) to `getQueryData()` and `setQueryData()` to ensure type safety

This can be solved by using [Key Factories](./query-keys.md#Managing-query-keys-key-factories-) and by [defining options with `defineQueryOptions()`](./query-keys.md#Typing-query-keys).

:::

## Via the UI

Handling the optimistic update directly in the UI is the simplest approach. This can be achieved by updating the UI immediately when the mutation is called. Combine the `variables` property of the mutation with invalidating affected queries to implement this method effectively.

This approach is possible when the mutation lives close to the query it updates, it allows to show the pending changes directly in the UI that renders a query:

```vue{12-18,33-35} twoslash
<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { getTodoList, createTodo } from './api/todos'

const { data: todoList } = useQuery({
  key: ['todos'],
  query: () => getTodoList(),
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

When doing this, it's important to remember to invalidate the query after the mutation has completed with `await queryCache.invalidateQueries()`. This will ensure that the query is refetched with the new data. By awaiting the invalidation, the mutation will stay in the loading state until all related queries have been refetched.

### When mutation is not collocated with the query

When the mutation is not collocated with the query it updates, you can still use the mutation state next to the query. In this case, **you must specify a key for the mutation** so it can be referenced by `mutationCache.getEntries()`:

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

Then, you can use `mutationCache.getEntries()` to access the mutation state in another component:

```ts
import { useMutationCache, useQuery } from '@pinia/colada'
import { getTodoList } from './api/todos'

const { data: todoList } = useQuery({
  key: ['todos'],
  query: () => getTodoList(),
})

const mutationCache = useMutationCache()
const mutationState = computed(() => {
  const mutation = mutationCache.getEntries({ key: ['createTodo'] })[0]
  return {
    isLoading: mutation?.asyncStatus.value === 'loading',
    variables: mutation?.vars,
  }
})
```
