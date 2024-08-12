# Optimistic updates

*NOTE: we assume that the auto-refetch of invalidated queries is available*

### Overview

To understand what optimistic updates are about, let's say a few words before about the context in which they can be useful. When we do a mutation, we aim to update our remote state, which implies that this update won't not be visible in the UI until:
1. the mutation completes
2. the queries which are impacted by the mutation are refetch (cf. the `keys` option of `useMutation`)

However, we may don't want to wait for these steps to give a positive feedback about the mutation to the user, especially for features where **frictionless updates are needed**.

That's precisely what optimistic updates are about : their goal is to display _the upcoming state_ before the mutation and the related refetch settle in order **to provide an instant positive feedback** to the user.

Of course, despite their name, optimistic updates also often need (depending on the way the update is made) to handle the pessimistic case, the failure of the mutation: then a rollback to the initial state needs to be implemented.

### Implementation

There are mainly two ways implement optimistic updates:
- updating locally (for example, handling the update in the component where the mutation result is displayed)
- updating globally, through the queries cache

We will walk through the two methods. For that, let's take again our todo list example. We added a feature, now we can edit the todo description. To achieve this, we created the following component:

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { useMutation } from '@pinia/colada'

  const props = withDefaults(
    defineProps<{
      description: string
      id: string
    }>()
  )

  const isEditing = ref(false)

  const { mutate } = useMutation({
    keys: () => [['todos']], // invalidates the `todos` query
    mutation: (newDescription: string) => {
      fetch(`/api/todos/${props.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: newDescription }),
      })
    }
  })
</script>

<template>
  <div>
    <input v-if="isEditing" @blur="mutate($event.target.value)">
    <span v-else>{{ description }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```

## First method: updating locally

In this case, the optimistic update is handled in the components (or, more generally speaking, in the scope) which display the mutation result.

We can distinguish two ways of doing this.

### Using the mutation hooks (only if the mutation lives in the same scope as the UI to update)

A possibility is to use the mutation hooks to optimistically update the state of the component (and in particular to rollback the `onError` hook in case of failure).

```vue {10-11,25-26,29-30}
<script setup lang="ts">
import { useMutation } from '@pinia/colada'
import { ref, watch } from 'vue'

const props = defineProps<{
  description: string
  id: string
}>()

const isEditing = ref(false)
// The component state, which will be optimistically updated
const displayedDescription = ref('')

watch(() => props.description, () => {
  if (!isEditing.value) displayedDescription.value = props.description
})

const { mutate } = useMutation({
  keys: () => [['todos']],
  mutation: (newDescription: string) => {
    fetch(`/api/todos/${props.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: newDescription }),
    })
  },
  onMutate(newDescription) {
    // Optimistic update
    displayedDescription.value = newDescription
  },
  onError() {
    // Rollback to the initial state if an error happened
    displayedDescription.value = props.description
  },
})
</script>

<template>
  <div>
    <input v-if="isEditing" @blur="mutate($event.target.value)">
    <span v-else>{{ displayedDescription }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```
However, since the hooks directly update the local state, this only works if the mutation lives in the same scope as the UI to update. If it is not the case, a more generic alternative is to use the mutation state to locally trigger the update.

### Using the mutation state to update the local UI

In this case, we will use the mutation state (especially the `pending` ref) to manually update the UI accordingly.

::: code-group

```vue [src/components/todo-description.vue] {19-20}
<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      description: string
      id: string
    }>()
  )
  const { updateToto, updateTodoPending } = useUpdateTodo()

  const isEditing = ref(false)
  const newDescription = ref('')
</script>

<template>
  <div>
    <input v-if="isEditing" v-model="newDescription" @blur="newDescription = updateTodo(newDescription)">
    <!-- Opimistic update based on the `pending` state of the mutation -->
    <span v-else>{{ updateTodoPending ? newDescription : description }}</span>
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
  const { mutate, ...rest } = useMutation({
    keys: () => [['todos']],
    mutation: (todoId, description) =>
      fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      })
  })

  return {
    ...rest,
    updateTodo: mutate,
    updateTodoPending: pending,
  }
})
```

```ts [src/queries/todos.ts]
import { defineQuery, useQuery } from '@pinia/colada'
import { ref } from 'vue'

export const useTodos = defineQuery(() => {
  const { data, pending, ...rest } = useQuery({
    key: ['todos'],
    query: () => fetch(`/api/todos?filter=${search.value}`, { method: 'GET' }),
  })
  return {
    ...rest,
    todoList: data,
    updateTodoPending: pending,
  }
})
```

:::

Note: as you may have noticed, here a rollback in case of errors is not needed.

// NOTE: since `pending` does not include the refetch of the invalidated queries, there will be here a "blank time" while the queries are refetching where the description will disappear.

## Second method: updating globally

Here, the idea will be to update (in advance) the cache of the queries itself (and rollbacking it to its initial state if the mutation fails). For this, we will use the mutation hooks.

```ts [src/mutations/update-todos.ts]
import { ref } from 'vue'
import { defineMutation, useMutation } from '@pinia/colada'
import { useTodos } from '@/queries/todos'

export const useCreateTodo = defineMutation(() => {
  const { mutate, ...rest } = useMutation({
    keys: () => [['todos']],
    mutation: (todoId, description) =>
      fetch(`/api/todos/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description }),
      }),
    onMutate: (todoId, description) => {
      const { todos } = useTodos()
      // Copy of the current todo list (for the rollback in case of errors)
      const initialTodos = [...todos.value]
      // Optimistically updated todo list
      // Note: we don't mutate `todos.value` directly because, for performance reasons, it is a `ShallowRef`
      // (and we will therefore have to reassign `todos.value` for the update to be effective)
      const updatedTodos = todos.value.map((todo) => {
        if (todo.id === todoId) {
          // Optimistic update
          return { ...todo, description }
        } else {
          return todo
        }
      })
      // Reasignement of `todos.value` (cf upper comment)
      todos.value = updatedTodos
      // The copy of the todos is returned to be available in the `onError` hook
      return { initialTodos }
    },
    onError: ({ initialTodos }) => {
      const { todos } = useTodos()
      // Rollback to the initial state in case of errors
      todos.value = initialTodos
    }
  })

  return {
    ...rest,
    updateTodo: mutate
  }
})
```

As you may have noticed, with this method the optimistic update is completely handled on the mutation side, and there is therefore no need to do anything on the component side.
