# Migrating from `@tanstack/vue-query` to `@pinia/colada`

This guide will help you migrate from `@tanstack/vue-query` to `@pinia/colada`. The two libraries have similar function names and API options, so it should be mostly a matter of updating the imports and adjusting the function names but there are still a couple of differences to be aware of.

::: info NOTE

This guide is a work in progress and may not cover all the differences between the two libraries. Please, help us improve it by contributing if you find any missing information.

:::

## Different status values

- `fetchStatus` is named `asyncStatus`
- `asyncStatus` values are `idle` and `loading` instead of `idle` and `fetching`
- Mutations also have an `asyncStatus` property and they match the query status values instead of having two different conventions

## Different defaults

Most of the sensible defaults from `@tanstack/vue-query` are kept in `@pinia/colada`, but there are a few differences to be aware of:

- Default `staleTime` is 5 seconds instead of 0

## Different option names

- `queryFn` is named `query`
- `queryKey` is named `key`
- `mutationFn` is named `mutation`

## API Differences

| TanStack Vue Query Equivalent       | Pinia Colada                    | Comment                                                                                                                                                               |
| ----------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refetch({ cancelRefetch: false })` | `refresh()`                     | See [Refetching Queries](../guide/queries.md#Refetching-Queries)                                                                                                      |
| `refetch({ throwOnError: true })`   | `refetch(true)`                 | Same for `refresh()`                                                                                                                                                  |
| `useQuery({ select })`              | none                            | Use a `computed()` or write the logic within `query` instead. [See this discussion](https://github.com/posva/pinia-colada/discussions/113#discussioncomment-11311927) |
| `useQuery({ refetchInterval })`     | Auto Refetch plugin             | Use the [`@pinia/colada-plugin-auto-refetch`](https://github.com/posva/pinia-colada/tree/main/plugins/auto-refetch)                                                   |
| `useQuery({ retry })`               | Retry plugin                    | Use the [`@pinia/colada-plugin-retry`](https://github.com/posva/pinia-colada/tree/main/plugins/retry)                                                                 |
| `useQuery().dataUpdatedAt`          | Custom plugin or component code | [Custom plugin](../advanced/plugins.md#Adding-a-dataUpdatedAt-property-to-queries)                                                                                    |

### Using `ref` and `computed` in `queryKey`

In Pinia Colada, `key` cannot **contain** a `computed` or `ref`, instead, it expects the key to be of type [`MaybeRefOrGetter`](https://vuejs.org/api/utility-types.html#maybereforgetter). In general, it simplifies keys handling and the function syntax is just so easy to use:

```ts
useQuery({
  queryKey: ['todos', { page: computed(() => route.query.id) }], // [!code --]
  key: () => ['todos', { page: route.query.page }], // [!code ++]
  // ...
})
```

### Component-specific side effects in mutations

TanStack's `mutate` function allows passing the promise resolution callbacks as mutation hooks. In Pinia Colada, to avoid _having multiple ways of doing the same thing_, use the `mutateAsync` method to handle those effects:

```ts
mutate(todo, { // [!code --]
  onSuccess, // [!code --]
  onError, // [!code --]
  onSettled, // [!code --]
}) // [!code --]
mutateAsync(todo)
  .then((data) => {
    onSuccess(data)
    onSettled?.(data, null)
  })
  .catch((err) => {
    onError(err)
    onSettled?.(undefined, err)
  })
```

## Differences in philosophy

These differences are a bit more subtle and span across multiple layers of the library.

### Structural sharing

TanStack implements a few rendering optimizations that are crucial in React but unnecessary in Vue. Pinia Colada does not implement these optimizations and instead relies on Vue's great reactivity system. The most notable difference is [Structural sharing](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations#structural-sharing) which is explained in their React docs but barely mentioned in the Vue docs. In short, TanStack query partially updates parts of the object based on what is changed. This means that if your query returns the same data as before and you use a watcher on the data, it will not trigger the watcher. **This is not the case in Pinia Colada** as it uses [Shallow Refs](https://vuejs.org/api/reactivity-advanced.html#shallowref) to store data to get the best performance and simply replaces the value after each successful query. In Vue apps, this is rarely a problem, but if it is, can still avoid the watcher code by comparing the values:

```ts
const { data } = useQuery({
  key: ['todos'],
  query: fetchTodos,
})

watch(data, (newData, oldData) => {
  if (!isSameData(newData, oldData)) {
    // do something with the new data
  }
})
```

### Missing utilities

Many utilities provided by TanStack are not included in Pinia Colada to let users get familiar with the [Query Cache](../advanced/query-cache.md) and implement their own utilities as needed. For example, there is no `useIsFetching` or `useIsMutating` composables, but you can easily implement them using the query cache (or mutation cache):

::: code-group

```ts [src/utils/pinia-colada.ts] twoslash
import {
  useMutationCache,
  useQueryCache,
  type UseMutationEntryFilter,
  type UseQueryEntryFilter,
} from '@pinia/colada'
import { computed, type ComputedRef } from 'vue'

/**
 * Returns a computed ref that indicates whether there are any ongoing queries
 * matching the provided filters.
 * @param filters - Optional filters to narrow down the queries to check.
 * @returns A computed ref that is true if there are ongoing queries, false otherwise.
 */
export function useIsLoading(filters?: UseQueryEntryFilter): ComputedRef<boolean> {
  const queryCache = useQueryCache()

  return computed(() =>
    queryCache.getEntries(filters).some((entry) => entry.asyncStatus.value === 'loading'),
  )
}

/**
 * Returns a computed ref that indicates whether there are any ongoing mutations
 * matching the provided filters.
 *
 * @param filters - Optional filters to narrow down the mutations to check.
 * @returns A computed ref that is true if there are ongoing mutations, false otherwise.
 */
export function useIsMutating(filters?: UseMutationEntryFilter): ComputedRef<boolean> {
  const mutationCache = useMutationCache()

  return computed(() =>
    mutationCache.getEntries(filters).some((entry) => entry.asyncStatus.value === 'loading'),
  )
}
```

:::

Given the agnostic nature of TanStack Query, these utilities [are not straightforward to implement](https://github.com/TanStack/query/blob/main/packages/vue-query/src/useIsFetching.ts#L10-L38) but Pinia Colada's tight integration with Vue makes them _just work™_

For example, `useMutationState()` becomes `computed(() => mutationCache.getEntries(...).map(...))`. Differently from `useQueryState()`, `useMutationState()` always returns the state of multiple mutations so there are no helpers like `data`, `status`, etc

If you are missing a helper utility, try to implement it using the query or mutation cache, in most cases, it's just calling `getEntries()` and then some `.map()`. These are not only easier to understand by humans without knowing the library but also easier to maintain and generate with AI tools.

### Reusable queries

Pinia Colada sticks to Vue reactivity principles and encourages you to embrace them. Often, you will be able to pass a getter to options (often looks like `() => myOption.value`), this keeps reactivity working as expected.
In TanStack Vue Query, you might use [`queryOptions`](https://tanstack.com/query/latest/docs/framework/vue/reference/queryOptions), in Pinia Colada, there is a similar feature but it's even more encouraged to use, it's [`defineQueryOptions`](../guide/queries.md#Organizing-Queries). There is also [`defineQuery`](../advanced/reusable-queries.md) which has no equivalent in TanStack Vue Query.

In its simplest form, you can reuse queries like this:

```ts
export const todosQuery = queryOptions({ // [!code --]
  // [!code --]
  queryKey: ['todos'], // [!code --]
  queryFn: getList, // [!code --]
}) // [!code --]
export const todosQuery = defineQueryOptions({ // [!code ++]
  // [!code ++]
  key: ['list'], // [!code ++]
  query: getList, // [!code ++]
}) // [!code ++]
```

Check the [Organizing Queries](../guide/queries.md#Organizing-Queries) section for more information, you will seed that there is dynamic version of `defineQueryOptions` that allows passing reactive parameters and that using key factories is also encouraged.
