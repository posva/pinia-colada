import { createConsoleReporter, defineDiagnostics } from 'nostics'

/**
 * Catalog of all user-facing diagnostics (errors and warnings) emitted by
 * Pinia Colada. Codes are permanent: never rename or reuse one. Each code has
 * a documentation page at https://pinia-colada.esm.dev/errors/.
 *
 * Categories: `R` runtime, `C` config, `B` build, `D` deprecation.
 */
export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/errors/${code.toLowerCase()}.md`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    PC_C0001: {
      why: 'root pinia plugin not detected.',
      fix: 'Make sure to install pinia with "app.use(pinia)" before installing the "PiniaColada" plugin, or manually pass the pinia instance in the options.',
    },

    PC_R0001: {
      why: (p: { composable: 'useQueryCache' | 'useMutationCache' }) =>
        `${p.composable}() was called outside of an injection context (component setup, store, navigation guard). You will get a warning about "inject" being used incorrectly from Vue.`,
      fix: 'Make sure to use it only in allowed places. See https://vuejs.org/guide/reusability/composables.html#usage-restrictions',
    },

    PC_R0002: {
      why: (p: { cache: 'query' | 'mutation' }) =>
        `The ${p.cache} cache cannot be directly set, it must be modified instead. This will fail in production.`,
      fix: 'Use the cache methods (e.g. "setQueryData()", "setEntryState()") to modify the cache instead of replacing it.',
    },

    PC_R0003: {
      why: 'useQuery() was called with an empty array as the key. It must have at least one element.',
      fix: `Pass a key with at least one element, e.g. ['todos'].`,
    },

    PC_R0004: {
      why: (p: { method: 'refresh' | 'fetch' }) =>
        `"entry.${p.method}()" was called but the entry has no options.`,
      fix: 'This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!',
    },

    PC_R0005: {
      why: (p: { key?: string }) =>
        `A mutation entry ${p.key ? `with key "${p.key}"` : 'without a key'} was mutated before being ensured.`,
      fix: 'If you are manually calling "mutationCache.mutate()", you should always ensure the entry first: "mutationCache.mutate(mutationCache.ensure(options, vars))". If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.',
    },

    PC_R0006: {
      why: (p: { key?: string }) =>
        `A mutation entry ${p.key ? `with key "${p.key}"` : 'without a key'} was reused.`,
      fix: 'If you are manually calling "mutationCache.mutate()", you should always ensure the entry first: "mutationCache.mutate(mutationCache.ensure(options, vars))". If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.',
    },

    PC_R0007: {
      why: 'defineMutation() composable was called outside of a component or effect scope. The mutation effects will never be cleaned up, which may cause memory leaks.',
      fix: 'Make sure to call it inside a component setup, an effect scope, or a store.',
    },

    PC_R0008: {
      why: 'Trying to load the previous page but "getPreviousPageParam" is not defined in the options. This will fail in production.',
      fix: 'Add a "getPreviousPageParam()" function to the "useInfiniteQuery()" options.',
    },

    PC_R0009: {
      why: (p: { direction: 'next' | 'previous' }) =>
        `Cannot load the ${p.direction} page: the query entry was not found in the cache.`,
      fix: 'Make sure the infinite query is active (e.g. used by a mounted component) before calling "loadNextPage()" or "loadPreviousPage()".',
    },
  },
})
