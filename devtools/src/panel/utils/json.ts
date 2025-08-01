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
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value == null // null or undefined
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

export function isJSONValue(value: unknown): value is JSONValue {
  if (isJSONPrimitive(value)) return true
  if (Array.isArray(value)) {
    return value.every(isJSONValue)
  }
  if (isPlainObject(value)) {
    return Object.values(value).every(isJSONValue)
  }
  return false
}

function isCollection(value: unknown): value is { length: number } | { size: number } {
  return value != null && typeof value === 'object' && ('length' in value || 'size' in value)
}

function formatCollection(value: { length: number } | { size: number }) {
  const size = 'length' in value ? value.length : value.size
  return `${value.constructor.name}[${size}]`
}

const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object'

export function formatValue(value: unknown) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'bigint') return `${value}n`
  if (isObject(value)) {
    if (isCollection(value)) return formatCollection(value)
    if (isPlainObject(value)) return `Object${Object.keys(value).length === 0 ? ' (empty)' : ''}`
    return `[${value.constructor.name}]`
  }
  return String(value)
}

function isPlainObject(value: unknown): value is { constructor?: typeof Object } {
  return isObject(value) && (value.constructor === Object || Object.getPrototypeOf(value) == null)
}

export function getValueType(value: unknown) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function getValueTypeClass(value: unknown): string {
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
