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

### Reusable queries

Pinia Colada tries to reuse state as much as possible to reduce memory footprint and improve performance, so instead of passing shared options to `useQuery`, it encourages you [to use `defineQuery()`](../advanced/reusable-queries.md) to encapsulates the shared logic. This patterns is even more powerful in Pinia Colada as it allows you to define custom logic and properties along the queries and reuse them across your components.

In its simplest form, you can reuse queries like this:

```ts
export const options = { // [!code --]
  queryKey: ['list'], // [!code --]
  queryFn: getList, // [!code --]
} // [!code --]
export const useList = defineQuery({ // [!code ++]
  key: ['list'], // [!code ++]
  query: getList, // [!code ++]
}) // [!code ++]
```

Check the [Reusable Queries](../advanced/reusable-queries.md) section for more information.
