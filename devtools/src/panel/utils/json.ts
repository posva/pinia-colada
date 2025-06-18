import { isObject } from '@vueuse/core'

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

export function formatValue(value: JSONValue): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (Array.isArray(value)) return '[Array]'
  if (typeof value === 'object') return `[${value.constructor.name}]`
  return String(value)
}

export function getValueType(value: any): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isObject(value)) return 'object'
  if (typeof value === 'boolean') return 'boolean'
  return typeof value
}

export function getValueTypeClass(value: any): string {
  const type = getValueType(value)
  switch (type) {
    case 'boolean':
      return 'text-blue-600'
    case 'string':
      return 'text-green-700'
    case 'number':
      return 'text-orange-600'
    case 'null':
      return 'text-gray-500'
    case 'undefined':
      return 'text-red-600'
    default:
      return ''
  }
}
