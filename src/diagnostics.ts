import { createConsoleReporter, defineDiagnostics } from 'nostics'

/**
 * Diagnostics catalog for Pinia Colada. Each code maps to a stable error page
 * under https://pinia-colada.esm.dev/errors/<code>.
 *
 * Codes follow `PC_XNNNN` where the category letter is the **area**:
 *
 * - `R` runtime
 * - `C` config
 * - `D` deprecation
 *
 * Published codes are permanent: never rename or reuse one.
 */
export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/errors/${code.toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    // useQueryCache() called outside of an injection context
    PC_R0001: {
      why: 'useQueryCache() was called outside of an injection context (component setup, store, navigation guard). You will get a warning about "inject" being used incorrectly from Vue.',
      fix: 'Make sure to use it only in allowed places. See https://vuejs.org/guide/reusability/composables.html#usage-restrictions',
    },
    // The reactive query cache was replaced instead of mutated
    PC_R0002: {
      why: 'The query cache cannot be directly set, it must be modified only.',
      fix: 'Mutate the existing cache instead of reassigning it. This will fail in production.',
    },
    // useQuery() called with an empty array key
    PC_R0003: {
      why: 'useQuery() was called with an empty array as the key. It must have at least one element.',
      fix: 'Provide a key with at least one element, e.g. ["todos"].',
    },
    // entry.refresh()/entry.fetch() called on an entry with no options
    PC_R0004: {
      why: (p: { action: 'refresh' | 'fetch' }) =>
        `"entry.${p.action}()" was called but the entry has no options.`,
      fix: 'This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!',
    },
    // defineMutation() composable called outside of a component or effect scope
    PC_R0005: {
      why: 'defineMutation() composable was called outside of a component or effect scope. The mutation effects will never be cleaned up, which may cause memory leaks.',
      fix: 'Make sure to call it inside a component setup, an effect scope, or a store.',
    },
    // useMutationCache() called outside of an injection context
    PC_R0006: {
      why: 'useMutationCache() was called outside of an injection context (component setup, store, navigation guard). You will get a warning about "inject" being used incorrectly from Vue.',
      fix: 'Make sure to use it only in allowed places. See https://vuejs.org/guide/reusability/composables.html#usage-restrictions',
    },
    // The reactive mutation cache was replaced instead of mutated
    PC_R0007: {
      why: 'The mutation cache instance cannot be set directly, it must be modified.',
      fix: 'Mutate the existing cache instead of reassigning it. This will fail in production.',
    },
    // A mutation entry was mutated before being ensured
    PC_R0008: {
      why: (p: { keyMessage: string }) =>
        `A mutation entry ${p.keyMessage} was mutated before being ensured. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first.`,
      fix: 'Ensure the entry first: "mutationCache.mutate(mutationCache.ensure(entry, vars))". If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.',
    },
    // A mutation entry was reused
    PC_R0009: {
      why: (p: { keyMessage: string }) =>
        `A mutation entry ${p.keyMessage} was reused. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first.`,
      fix: 'Ensure the entry first: "mutationCache.mutate(mutationCache.ensure(entry, vars))". If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.',
    },
    // loadPreviousPage() called without getPreviousPageParam defined
    PC_R0010: {
      why: 'useInfiniteQuery() is trying to load the previous page but `getPreviousPageParam` is not defined in options.',
      fix: 'Define `getPreviousPageParam` in the options passed to useInfiniteQuery(). This will fail in production.',
    },
    // loadPage() could not find the query entry in the cache
    PC_R0011: {
      why: 'useInfiniteQuery() cannot load the page: query entry not found in cache.',
      fix: 'Make sure the query has been mounted with useInfiniteQuery() before calling loadNextPage()/loadPreviousPage().',
    },
    // PiniaColada plugin installed without pinia
    PC_R0012: {
      why: 'root pinia plugin not detected.',
      fix: 'Make sure you install pinia before installing the "PiniaColada" plugin, or manually pass the pinia instance.',
    },
  },
})
