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
- **Repository**: https://github.com/Barbapapazes/pinia-colada-plugin-recently-successful
- **npm**: https://www.npmjs.com/package/pinia-colada-plugin-recently-successful

Quick usage:

- Register it in `PiniaColada` with `plugins: [PiniaColadaRecentlySuccessfulPlugin()]`.
- Use `recentlySuccessful` from `useMutation()`.

## Pinia Logger

Logs fetches, cache hits, `setQueryData`, invalidations, removals and mutations to the browser console, with the key, data and duration.

- **Extends**: queries, mutations, dev UX
- **Package**: `pinia-logger`, imported from `pinia-logger/colada`
- **Repository**: https://github.com/cwdx/pinia-logger
- **npm**: https://www.npmjs.com/package/pinia-logger

Quick usage:

- Register it in `PiniaColada` with `plugins: [PiniaColadaLogger()]`.
- Pass `filter: ({ type }) => type !== "hit"` to skip cache hits.
