import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/diagnostics/${code.toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    PC_R0001: {
      why: '[@pinia/colada] root pinia plugin not detected. Make sure you install pinia before installing the "PiniaColada" plugin or to manually pass the pinia instance.',
      fix: 'Install the Pinia plugin before Pinia Colada, or pass the Pinia instance with the pinia option.',
    },
    PC_R0002: {
      why: '[@pinia/colada] The query cache cannot be directly set, it must be modified only. This will fail on production',
      fix: 'Use query cache methods such as setQueryData(), invalidateQueries(), or remove() instead of replacing the cache map.',
    },
    PC_R0003: {
      why: 'useQuery() was called with an empty array as the key. It must have at least one element.',
      fix: 'Pass a stable key with at least one serializable element, for example ["todos"].',
    },
    PC_R0004: {
      why: (p: { method: 'refresh' | 'fetch' }) =>
        `"entry.${p.method}()" was called but the entry has no options. This is probably a bug, report it to pinia-colada with a boiled down example to reproduce it. Thank you!`,
      fix: 'Create the entry through useQuery(), defineQuery(), or ensure() with options before calling this method.',
    },
    PC_R0005: {
      why: (p: { composable: 'useQueryCache' | 'useMutationCache' }) =>
        `${p.composable}() was called outside of an injection context (component setup, store, navigation guard) You will get a warning about "inject" being used incorrectly from Vue. Make sure to use it only in allowed places.\nSee https://vuejs.org/guide/reusability/composables.html#usage-restrictions`,
      fix: 'Call this composable from component setup, a store, a navigation guard, or another Vue injection context.',
    },
    PC_R0006: {
      why: '[@pinia/colada]: The mutation cache instance cannot be set directly, it must be modified. This will fail in production.',
      fix: 'Use mutation cache methods such as ensure(), mutate(), remove(), or setEntryState() instead of replacing the cache map.',
    },
    PC_R0007: {
      why: (p: { keyMessage: string }) =>
        `[@pinia/colada] A mutation entry ${p.keyMessage} was mutated before being ensured. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first If not, this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.`,
      fix: 'Call mutationCache.mutate(mutationCache.ensure(entry, vars)) when mutating entries manually.',
    },
    PC_R0008: {
      why: (p: { keyMessage: string }) =>
        `[@pinia/colada] A mutation entry ${p.keyMessage} was reused. If you are manually calling the "mutationCache.mutate()", you should always ensure the entry first: "mutationCache.mutate(mutationCache.ensure(entry, vars))". If not this is probably a bug. Please, open an issue on GitHub with a boiled down reproduction.`,
      fix: 'Create or ensure a fresh mutation entry before each manual mutation call.',
    },
    PC_R0009: {
      why: '[@pinia/colada]: defineMutation() composable was called outside of a component or effect scope. The mutation effects will never be cleaned up, which may cause memory leaks. Make sure to call it inside a component setup, an effect scope, or a store.',
      fix: 'Call the returned mutation composable inside component setup, an effect scope, or a Pinia store.',
    },
    PC_R0010: {
      why: '[useInfiniteQuery] Trying to load previous page but `getPreviousPageParam` is not defined in options. This will fail in production.',
      fix: 'Define getPreviousPageParam when calling useInfiniteQuery() if previous pages can be loaded.',
    },
    PC_R0011: {
      why: '[useInfiniteQuery] Cannot load next page: query entry not found in cache.',
      fix: 'Make sure the infinite query is mounted and its cache entry exists before loading more pages.',
    },
  },
})
