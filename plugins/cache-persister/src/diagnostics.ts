import { createConsoleReporter, defineDiagnostics } from 'nostics'
import { createDevReporter } from 'nostics/reporters/dev'

/**
 * Catalog of user-facing diagnostics emitted by the cache persister plugin.
 * Codes are permanent: never rename or reuse one. Each code has a documentation
 * page at https://pinia-colada.esm.dev/errors/.
 *
 * Categories: `R` runtime, `C` config, `B` build, `D` deprecation.
 */
export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://pinia-colada.esm.dev/errors/${code.toLowerCase()}.md`,
  reporters: [
    /*#__PURE__*/ createConsoleReporter(),
    // Forward diagnostics to the Vite dev server during dev
    ...(process.env.NODE_ENV === 'development' ? [/*#__PURE__*/ createDevReporter()] : []),
  ],
  codes: {
    PINIA_COLADA_CACHE_PERSISTER_R0001: {
      why: 'Failed to persist the cache to storage.',
      fix: 'The data is likely not serializable (e.g. `BigInt`, functions) or the storage quota was exceeded. Pass a `stringify` codec that handles your data, or handle the error yourself with the `onStringifyError` option.',
    },

    PINIA_COLADA_CACHE_PERSISTER_R0002: {
      why: 'The `onStringifyError` handler threw an error.',
      fix: 'The handler must not throw: in production the error is not caught and breaks cache persistence.',
    },

    PINIA_COLADA_CACHE_PERSISTER_R0003: {
      why: 'Failed to parse the persisted cache. Starting with an empty cache.',
      fix: 'The stored data is likely corrupt or was written by a different `stringify`. Pass a matching `parse` option, or handle the error yourself with the `onParseError` option.',
    },

    PINIA_COLADA_CACHE_PERSISTER_R0004: {
      why: 'The `onParseError` handler threw an error.',
      fix: 'The handler must not throw: in production the error is not caught and prevents `isCacheReady()` from resolving.',
    },
  },
})
