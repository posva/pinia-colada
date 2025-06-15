// NOTE: copied from pinia colada src/utils.ts

/**
 * Valid primitives that can be stringified with `JSON.stringify`.
 *
 * @internal
 */
export type JSONPrimitive = string | number | boolean | null | undefined

/**
 * Checks if a value is a valid JSON primitive.
 *
 * @param value - The value to check
 */
export function isJSONPrimitive(value: unknown): value is JSONPrimitive {
  return (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value == null // null or undefined
  )
}

/**
 * Utility type to represent a flat object that can be stringified with
 * `JSON.stringify` no matter the order of keys.
 *
 * @internal
 */
export interface ObjectFlat {
  [key: string]: JSONPrimitive | Array<JSONPrimitive>
}

/**
 * Valid values that can be stringified with `JSON.stringify`.
 *
 * @internal
 */
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue }
