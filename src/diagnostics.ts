import { createConsoleReporter, defineDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'

export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/errors/${code.toLowerCase()}`,
  reporters: [
    // multiline
    /*#__PURE__*/ createConsoleReporter(),
    /*#__PURE__*/ createDevReporter(),
  ],
  codes: {
    PC_C0001: {
      why: 'Root pinia plugin not detected. Make sure you install pinia before installing the "PiniaColada" plugin.',
      fix: 'Call app.use(pinia) before app.use(PiniaColada), or pass { pinia } in PiniaColada options.',
    },

    PC_R0001: {
      why: 'useQueryCache() was called outside of an injection context (component setup, store, navigation guard). You will get a warning about "inject" being used incorrectly from Vue.',
      fix: 'Use useQueryCache() only in allowed places. See https://vuejs.org/guide/reusability/composables.html#usage-restrictions',
    },

    PC_R0002: {
      why: 'The query cache cannot be directly set, it must be modified only.',
      fix: 'Use query cache methods (refresh, invalidate, etc.) instead of assigning to queryCache.caches.',
    },

    PC_R0003: {
      why: 'useQuery() was called with an empty array as the key.',
      fix: 'The key must have at least one element, e.g. key: ["todos"].',
    },

    PC_R0004: {
      why: '"entry.refresh()" was called but the entry has no options. This is probably a bug.',
      fix: 'Open an issue at https://github.com/posva/pinia-colada with a minimal reproduction.',
    },

    PC_R0005: {
      why: '"entry.fetch()" was called but the entry has no options. This is probably a bug.',
      fix: 'Open an issue at https://github.com/posva/pinia-colada with a minimal reproduction.',
    },

    PC_R0006: {
      why: 'useMutationCache() was called outside of an injection context (component setup, store, navigation guard). You will get a warning about "inject" being used incorrectly from Vue.',
      fix: 'Use useMutationCache() only in allowed places. See https://vuejs.org/guide/reusability/composables.html#usage-restrictions',
    },

    PC_R0007: {
      why: 'The mutation cache instance cannot be set directly, it must be modified.',
      fix: 'Use mutation cache methods instead of assigning to mutationCache.caches.',
    },

    PC_R0008: {
      why: (p: { key?: string }) =>
        `A mutation entry ${p.key ? `with key "${p.key}"` : 'without a key'} was mutated before being ensured. If you are manually calling "mutationCache.mutate()", always ensure the entry first. Otherwise this is a bug.`,
      fix: 'Call mutationCache.ensure(entry, vars) before mutationCache.mutate(entry), or open an issue at https://github.com/posva/pinia-colada.',
    },

    PC_R0009: {
      why: (p: { key?: string }) =>
        `A mutation entry ${p.key ? `with key "${p.key}"` : 'without a key'} was reused without being ensured first. If you are manually calling "mutationCache.mutate()", always ensure the entry first. Otherwise this is a bug.`,
      fix: 'Use mutationCache.mutate(mutationCache.ensure(entry, vars)), or open an issue at https://github.com/posva/pinia-colada.',
    },

    PC_R0010: {
      why: 'defineMutation() composable was called outside of a component or effect scope. The mutation effects will never be cleaned up, which may cause memory leaks.',
      fix: 'Call it inside a component setup(), an effect scope, or a store.',
    },

    PC_R0011: {
      why: 'Trying to load previous page but `getPreviousPageParam` is not defined in options.',
      fix: 'Define `getPreviousPageParam` in useInfiniteQuery options.',
    },

    PC_R0012: {
      why: 'Cannot load next page: query entry not found in cache.',
      fix: 'Make sure the query entry is still active when calling loadNextPage() or loadPreviousPage().',
    },
  },
})
