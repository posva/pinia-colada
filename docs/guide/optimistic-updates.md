# Optimistic updates

### Overview

To understand what optimistic updates are about, let's say a few words before about the context in which they can be useful. When we do a mutation, we aim to update our remote state, which implies that this update won't not be visible in the UI until:
1. the mutation completes
2. the queries which are invalidated by the mutation are refetch (cf. the `keys` option of `useMutation`)

However, we may don't want to wait for these steps to give a positive feedback about the mutation to the user, especially for features where **frictionless updates are needed**.

That's precisely what optimistic updates are about: their goal is to display _the upcoming state_ before the mutation and the related refetch settle in order **to provide an instant positive feedback** to the user.

Of course, despite their name, optimistic updates also often need (depending on the way the update is made) to handle the pessimistic case, where the mutation fails: then a rollback to the initial state needs to be implemented.

### Implementation

There are mainly two ways implement optimistic updates:
- updating locally (for example, handling the update in the component where the mutation result is displayed)
- updating globally, through the queries cache

We will walk through the two methods. For that, let's take again our Todo List example. We added a feature, now we can edit the todo description. To achieve this, we created the following component, which is in charge of the description part of a Todo:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'

interface Todo {
  id: string
  description: string
}

const props = defineProps<{
  todo: Todo
}>()

const isEditing = ref(false)
const newDescription = ref('')

const { mutate, isLoading } = useMutation({
  keys: () => [['todos']], // invalidates the `todos` query
  mutation: () => fetch(`/api/todos/${props.todo.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: newDescription }),
  }),
})
</script>

<template>
  <div>
    <input v-if="isEditing" v-model="newDescription" @blur="mutate(); isEditing = false">
    <span v-else-if="isLoading">Loading...</span>
    <span v-else>{{ todo.description }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```

## First method: updating locally

With this method, the optimistic update is handled locally in the components (or, more generally speaking, in the scope) related to the mutation.

We can distinguish two ways of doing this.

### Using the mutation hooks (only if the mutation lives in the same scope as the UI to update)

A first possibility consists in using the mutation hooks to optimistically update the state of the component (and in particular to rollback the `onError` hook in case of failure). This is a rather imperative method since we manually update the state at some specific events (through the hooks).

```vue {16-18,33-34,37-38}
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation } from '@pinia/colada'

interface Todo {
  id: string
  description: string
}

const props = defineProps<{
  todo: Todo
}>()

const isEditing = ref(false)
const newDescription = ref('')

// The component state, which will be optimistically updated
const displayedDescription = ref(props.todo?.description)
watch(() => props.todo, () => {
  if (!isEditing.value) displayedDescription.value = props.todo.description
})

const { mutate } = useMutation({
  keys: () => [['todos']],
  mutation: async () => {
    await new Promise((res) => setTimeout(res, 2000))
    return fetch(`/api/todos/${props.todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: newDescription }),
    })
  },
  onMutate() {
    // Optimistic update
    displayedDescription.value = newDescription.value
  },
  onError() {
    // Rollback to the initial state if an error happened
    displayedDescription.value = props.todo.description
  },
})
</script>

<template>
  <div>
    <input v-if="isEditing" v-model="newDescription" @blur="mutate(); isEditing = false">
    <span v-else>{{ displayedDescription }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```

However, an important limitation is that, since the hooks directly update the local state, this only works if the mutation lives in the same scope as the UI to update. If it is not the case, a more generic alternative is needed, which we will see in the next paragraph.

### Using the mutation state to update the local UI

Now, we will use the mutation state (especially the `pending` ref) to locally update the UI while the mutation is happening. This is more declarative than the previous method.

::: code-group

```vue [src/components/todo-description.vue] {22-23}
<script setup lang="ts">
import { ref } from 'vue'
import { useUpdateTodo } from '@/mutations/updateTodos'

interface Todo {
  id: string
  description: string
}
defineProps<{
  todo: Todo
}>()

const { mutate, isLoading } = useUpdateTodo()

const isEditing = ref(false)
const newDescription = ref('')
</script>

<template>
  <div>
    <input v-if="isEditing" v-model="newDescription" @blur="mutate(); isEditing = false">
    <!-- Opimistic update based on the `isLoading` state of the mutation -->
    <span v-else>{{ isLoading ? newDescription : todo.description }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```

```ts [src/mutations/update-todos.ts]
import { ref } from 'vue'
import { defineMutation, useMutation } from '@pinia/colada'

export const useCreateTodo = defineMutation(() => {
  return useMutation({
    keys: () => [['todos']],
    mutation: (todoId, description) =>
      fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      })
  })
})
```

:::

Note: as you may have noticed, here a rollback in case of errors is not needed.

// NOTE: since the `isLoading` status does not include the refetch of the invalidated queries, there will be here a time (when the queries are refetching) where the description will disappear.

## Second method: updating globally

Here, the idea will be to optimistically update the cache of the queries itself. With this method, the update is completely handled on the mutation side, and there is therefore no need to do anything on the component side.

For this, we will use:
- the mutation hooks
- the `useQueryCache` composable to manipulate the cache of the updated queries

::: code-group

```ts [src/mutations/update-todos.ts] {27,29,33}
import { defineMutation, useMutation, useQueryCache } from '@pinia/colada'
import { useTodos } from '@/queries/todos'

export const useCreateTodo = defineMutation(() => {
  // To update the `todos` query cache
  const { setQueryData } = useQueryCache()
  return useMutation({
    keys: () => [['todos']],
    mutation: ({ id, description }: { id: string, description: string }) => fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    }),
    onMutate: ({ id, description }) => {
      const { todos } = useTodos()
      // Copy of the current todo list (for the rollback in case of errors)
      const initialTodos = [...todos.value]
      const updatedTodos = todos.value.map((todo) => {
        if (todo.id === id) {
          // Update of the modified Todo
          return { ...todo, description }
        } else {
          return todo
        }
      })
      // Updates the `todos` query cache
      // Note: this does not modify the invalidated status of the query (cf. `keys` option)
      setQueryData(['todos'], updatedTodos)
      // The copy of the todos is returned to be available in the `onError` hook
      return { initialTodos }
    },
    onError: ({ initialTodos }) => {
      // Rollback to the initial state in case of errors
      setQueryData(['todos'], initialTodos)
    }
  })
})
```

```ts [src/queries/todos.ts]
import { defineQuery, useQuery } from '@pinia/colada'

export const useFilteredTodos = defineQuery(() => {
  return useQuery({
    key: ['todos'],
    query: () => fetch(`/api/todos`, { method: 'GET' }),
  })
})
```

:::

Note: modifying the query cache with the `setQueryData` action does not modify the 'invalidated' status of the query (provided that it has been invalidated, cf. the `keys` mutation option). This leads to the following flow:
1. the query cache is optimistically updated
2. if the mutation is successful, the query will be refetch (right after if it is currently used, or as soon as it will be used again if it is not active)
