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
 *     defaultError: MyCustomError
 *   }
 * }
 * ```
 */
export interface TypesConfig {
  // defaultError:
}

/**
 * The default error type used.
 * @internal
 */
export type ErrorDefault = TypesConfig extends Record<'defaultError', infer E> ? E : Error

// TODO: meta to add properties?
