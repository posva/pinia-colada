## Optimistic updates

// NOTE: we assume that the auto-refetch of invalidated queries is available

To understand what optimistic updates are about, let's say a few words before about the context in which they can be useful. When we do a mutation, we aim to update our remote state, which implies that this update won't not be visible in the UI until:
1. the mutation completes
2. the queries which are impacted by the mutation are refetch (cf. the `keys` option of `useMutation`)

However, we may don't want to wait for these steps to give a positive feedback about the mutation to the user, especially for features where frictionless updates are needed.

That's precisely what optimistic updates are about : their goal is to display _the upcoming state_ before the mutation and the related refetch settle in order **to provide an instant positive feedback** to the user.

Of course, despite their name, optimistic updates also often need (depending on the way the update is made) to handle the pessimistic case, the failure of the mutation: then a rollback to the initial state needs to be implemented.

There are mainly two ways implement optimistic updates: by updating locally (for example, handling the update in the component where the mutation result is displayed) or by updating globally, through the queries cache.

We will walk through the two methods. For that, let's take again our todo list example. We added a feature, now we can edit the todo description. To achieve this, we created the following component:

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'
  const props = withDefaults(
    defineProps<{
      description: string
      id: string
    }>()
  )
  const isEditing = ref(false)

  const { mutate } = useMutation({
    key: () => ['update-todo-description', route.params.id],
    // Invalidate the `todos` query (so it will be refetch if the mutation is successful)
    keys: () => [['todos']],
    mutation: (newDescription) =>
      fetch(`/api/todos/${props.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: newDescription }),
      }),
  })
</script>

<template>
  <div>
    <input v-if="isEditing" @blur="mutate">
    <span v-else>{{ displayedDescription }}</span>
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

```vue twoslash
<script setup lang="ts">
import { useMutation } from '@pinia/colada'
  const props = withDefaults(
    defineProps<{
      description: string
      id: string
    }>()
  )
  const isEditing = ref(false)
  // The component state, which will be optimistically updated
  const displayedDescription = ref('')

  watch(() => props.description, () => {
    if (!isEditing.value) displayedDescription.value = props.description
  })

  const { mutate } = useMutation({
    key: () => ['update-todo-description', route.params.id],
    keys: () => [['todos']],
    mutation: (newDescription) =>
      fetch(`/api/todos/${props.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: newDescription }),
      }),
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
    <input v-if="isEditing" @blur="mutate">
    <span v-else>{{ displayedDescription }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```
However, since the hooks directly update the local state, this only works if the mutation lives in the same scope as the UI to update. If it is not the case, a more generic alternative is to use the mutation state to "compute" the update. / to base the OU on the mutation state.

### Using the mutation state to update the local UI

In this case, we will use the mutation state (especially the `pending` ref) to manually update the UI accordingly.

::: code-group

```ts [src/mutations/update-todo-description.ts] twoslash
import { useMutation } from '@pinia/colada'

export const useUpdateTodoDescription = () => useMutation({
    key: () => ['update-todo-description', route.params.id],
    keys: () => [['todos']],
    mutation: (newDescription) =>
      fetch(`/api/todos/${props.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: newDescription }),
      })
  })
```

```ts [src/mutations/update-todo-description.ts] twoslash
import { useMutation } from '@pinia/colada'

export const useUpdateTodoDescription = () => useMutation({
    key: () => ['update-todo-description', route.params.id],
    keys: () => [['todos']],
    mutation: (newDescription) =>
      fetch(`/api/todos/${props.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: newDescription }),
      })
  })
```

```vue [src/components/todo-description.vue] twoslash
<script setup lang="ts">
  import { useUpdateTodoDescription } from '@/mutations/update-todo-description'

  const props = withDefaults(
    defineProps<{
      description: string
      id: string
    }>()
  )
  const { mutate, pending: mutationPending } = useUpdateTodoDescription()

  const isEditing = ref(false)
  const newDescription = ref('')
</script>

<template>
  <div>
    <input v-if="isEditing" @blur="updateDescription">
    <span v-else>{{ mutationPending ? newDescription : description }}</span>
  </div>
  <button @click="isEditing = !isEditing">
    {{ isEditing ? 'Cancel' : 'Edit description' }}
  </button>
</template>
```

:::

// NOTE: since `pending` does not include the refetch of the invalidated queries, there will be here a "blank time" while the queries are refetching where the description will disappear.
