# Community plugins

This page lists third-party plugins built by the community.

Want your plugin listed here?

- Add it to this page via a pull request
- Include a short description, repository link, and npm link
- Mention what it extends (queries, mutations, cache persistence, dev UX, …)

::: tip Naming and discoverability

Give it a clear name with the `pinia-colada-plugin-` prefix, and add the `pinia-colada-plugin` keyword to your `package.json` to help others find it.

:::

Want to build your own plugin? See [Writing plugins](./writing-plugins.md).

For integrations that aren't plugins, see [Community](../community.md).

## Recently Successful

Adds a `recentlySuccessful` ref to `useMutation()` results. It becomes `true` on success and automatically resets after a configurable duration.

- **Extends**: mutations
- **Package**: `pinia-colada-plugin-recently-successful`
- **Repository**: <https://github.com/Barbapapazes/pinia-colada-plugin-recently-successful>
- **npm**: <https://npmx.dev/package/pinia-colada-plugin-recently-successful>

Quick usage:

- Register it in `PiniaColada` with `plugins: [PiniaColadaRecentlySuccessfulPlugin()]`.
- Use `recentlySuccessful` from `useMutation()`.

## Pinia Logger

Logs activity to the browser console.

- **Extends**: queries, mutations
- **Package**: `pinia-logger`, imported from `pinia-logger/colada`
- **Repository**: <https://github.com/cwdx/pinia-logger>
- **npm**: <https://npmx.dev/package/pinia-logger>

Quick usage:

- Register it in `PiniaColada` with `plugins: [PiniaColadaLogger()]`.
- Pass `filter: ({ type }) => type !== "hit"` to skip cache hits.

## Laravel Echo

Keeps a query's cache current from Laravel Echo broadcasts: a channel is joined while the cache entry lives and left when it is removed, reference-counted across entries. The websocket connection counts towards cache validity — `staleTime` can be relaxed while connected, the query's own value returns on disconnect, and a reconnect invalidates each entry once.

- **Extends**: queries
- **Package**: `@kirchdev/pinia-colada-plugin-laravel-echo`
- **Repository**: <https://github.com/kirchDev/pinia-colada-plugin-laravel-echo>
- **npm**: <https://npmx.dev/package/@kirchdev/pinia-colada-plugin-laravel-echo>

Quick usage:

- Register it in `PiniaColada` with `plugins: [PiniaColadaLaravelEcho({ echo })]`.
- Add an `echo` option with a `channel` and `listen` handlers to `useQuery()`.
