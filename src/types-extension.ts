/**
 * Allows you to extend the default types of the library.
 *
 * @example
 * ```ts
 * // types-extension.d.ts
 * import '@pinia/colada'
 * export {}
 * declare module '@pinia/colada' {
 *   interface TypesConfig {
 *     Error: MyCustomError
 *   }
 * }
 * ```
 */
export interface TypesConfig {
  // Error:
}

/**
 * The default error type used.
 * @internal
 */
export type ErrorDefault =
  TypesConfig extends Record<'Error', infer E> ? E : Error

// TODO: meta to add properties?
