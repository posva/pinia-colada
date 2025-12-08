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
 *     queryMeta: {
 *      onErrorMessage?: string
 *      }
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

/**
 * The meta information stored alongside each query inferred from the {@link TypesConfig}.
 * @internal
 */
export type QueryMeta =
  TypesConfig extends Record<'queryMeta', infer M> ? M : Record<string, unknown>

// TODO:
// export type MutationMeta = TypesConfig extends Record<'mutationMeta', infer M>
