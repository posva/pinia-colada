/// <reference types="vite/client" />

// Ambient declarations for the devtools source only. This file is excluded
// from the published types (see the `Dts` plugin `exclude` in the vite configs).

// replaced at build time (see vite.config `define`)
declare const NODE_ENV: string

// types for the local copy of the match-container polyfill
interface HTMLElement {
  matchContainer: (
    containerQueryString: string,
  ) => import('./src/panel/composables/use-container-media-query').ContainerQueryList
}
