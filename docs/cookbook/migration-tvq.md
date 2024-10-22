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
