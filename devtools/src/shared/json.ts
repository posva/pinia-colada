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

function isCollection(
  value: unknown,
): value is Iterable<unknown> & ({ length: number } | { size: number }) {
  return (
    value != null &&
    typeof value === 'object' &&
    ('length' in value || 'size' in value) &&
    Symbol.iterator in value
  )
}

function formatCollection(value: { length: number } | { size: number }) {
  const size = 'length' in value ? value.length : value.size
  return `${value.constructor.name}[${size}]`
}

export const isObject = (val: unknown): val is Record<any, any> =>
  val !== null && typeof val === 'object'

export function formatValue(value: unknown) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (Object.is(value, -0)) return '-0'
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}`
  if (isObject(value)) {
    if (value instanceof Number) return `Number(${value.valueOf()})`
    if (value instanceof String) return `String("${value.valueOf()}")`
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 'Invalid Date' : `Date(${value.toISOString()})`
    }
    if (value instanceof RegExp) return value.toString()
    if (value instanceof Error) return `${value.name}(${value.message})`
    if (isCollection(value)) return formatCollection(value)
    if (isPlainObject(value)) {
      if (Object.getPrototypeOf(value) === null) return 'Object(null prototype)'
      if ('__constructorName' in value && typeof value.__constructorName === 'string') {
        return value.__constructorName
      }
      return `Object${Object.keys(value).length === 0 ? ' (empty)' : ''}`
    }
    if (value.toString !== Object.prototype.toString) return String(value)
    return `[${value.constructor.name}]`
  }
  return String(value)
}

export function isPlainObject(value: unknown): value is { constructor?: typeof Object } {
  return isObject(value) && (value.constructor === Object || Object.getPrototypeOf(value) == null)
}

export function getValueType(value: unknown) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  if (value instanceof RegExp) return 'regexp'
  if (value instanceof Error) return 'error'
  return typeof value
}

const VALUE_TYPE_CSS_CLASS = {
  string: 'text-(--devtools-syntax-green)',
  boolean: 'text-(--devtools-syntax-orange)',
  number: 'text-(--devtools-syntax-orange)',
  null: 'text-(--devtools-syntax-object-blue)',
  undefined: 'text-(--devtools-syntax-object-blue)',
  array: 'text-(--ui-text)',
  function: 'text-(--ui-text)',
  object: 'text-(--ui-text)',
  symbol: 'text-(--devtools-syntax-object-blue)',
  bigint: 'text-(--devtools-syntax-orange)',
  date: 'text-(--devtools-syntax-sapphire)',
  regexp: 'text-(--devtools-syntax-pale-blue)',
  error: 'text-(--devtools-syntax-red)',
} satisfies Partial<Record<ReturnType<typeof getValueType>, string>>

export function getValueTypeClass(value: unknown): string | undefined {
  return VALUE_TYPE_CSS_CLASS[getValueType(value)] || '--ui-text'
}

export interface ValueDisplayToken {
  text: string
  class?: string
}

export const VALUE_DISPLAY = Symbol.for('@pinia/colada-devtools/value-display')
export const VALUE_DETAILS = Symbol.for('@pinia/colada-devtools/value-details')

export interface DevtoolsDisplayValue {
  [VALUE_DISPLAY]?(): ValueDisplayToken[]
  [VALUE_DETAILS]?(): Record<string, unknown>
}

const SYNTAX_CLASS = {
  orange: 'text-(--devtools-syntax-orange)',
  gray: 'text-(--devtools-syntax-gray)',
  green: 'text-(--devtools-syntax-green)',
  purple: 'text-(--devtools-syntax-purple)',
  sapphire: 'text-(--devtools-syntax-sapphire)',
  red: 'text-(--devtools-syntax-red)',
  objectBlue: 'text-(--devtools-syntax-object-blue)',
} as const

export function getValueDisplayTokens(value: unknown): ValueDisplayToken[] {
  if (isObject(value)) {
    const display = (value as DevtoolsDisplayValue)[VALUE_DISPLAY]
    if (display) return display.call(value)
  }

  if (typeof value === 'function') {
    return [
      { text: 'ƒ', class: SYNTAX_CLASS.purple },
      { text: ` ${value.name || 'anonymous'}`, class: SYNTAX_CLASS.sapphire },
    ]
  }

  if (value instanceof Number) {
    return objectCallTokens('Number', String(value.valueOf()), SYNTAX_CLASS.orange)
  }

  if (value instanceof String) {
    return objectCallTokens('String', `"${value.valueOf()}"`, SYNTAX_CLASS.green)
  }

  if (typeof value === 'symbol') {
    return [
      { text: 'Symbol', class: SYNTAX_CLASS.objectBlue },
      { text: '(', class: SYNTAX_CLASS.gray },
      { text: value.description || '', class: SYNTAX_CLASS.green },
      { text: ')', class: SYNTAX_CLASS.gray },
    ]
  }

  if (value instanceof Error) {
    return [
      { text: value.name, class: SYNTAX_CLASS.red },
      { text: '(', class: SYNTAX_CLASS.gray },
      { text: value.message, class: SYNTAX_CLASS.green },
      { text: ')', class: SYNTAX_CLASS.gray },
    ]
  }

  if (
    isPlainObject(value) &&
    '__constructorName' in value &&
    typeof value.__constructorName === 'string'
  ) {
    return [{ text: value.__constructorName, class: SYNTAX_CLASS.objectBlue }]
  }

  const formatted = formatValue(value)
  const bracketedInstance = /^\[([^\s\]]+)(.*)]$/.exec(formatted)
  if (bracketedInstance) {
    return [
      { text: '[', class: SYNTAX_CLASS.gray },
      { text: bracketedInstance[1], class: SYNTAX_CLASS.objectBlue },
      { text: bracketedInstance[2] },
      { text: ']', class: SYNTAX_CLASS.gray },
    ]
  }

  return [{ text: formatted, class: getValueTypeClass(value) }]
}

function objectCallTokens(type: string, value: string, valueClass: string): ValueDisplayToken[] {
  return [
    { text: type, class: SYNTAX_CLASS.objectBlue },
    { text: '(', class: SYNTAX_CLASS.gray },
    { text: value, class: valueClass },
    { text: ')', class: SYNTAX_CLASS.gray },
  ]
}

export function getValueDetails(value: unknown): Record<string, unknown> | undefined {
  if (!isObject(value)) return
  const details = (value as DevtoolsDisplayValue)[VALUE_DETAILS]
  return details?.call(value)
}
