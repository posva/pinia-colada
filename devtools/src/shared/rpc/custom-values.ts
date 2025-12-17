import { isPlainObject } from '../json'

export interface NonSerializableValue_Base {
  __custom: '@@pc-non-serializable'
  __type: string
  value: unknown
}

export interface NonSerializableValue_Function extends NonSerializableValue_Base {
  __type: 'function'
  value: string
}

export interface NonSerializableValue_Symbol extends NonSerializableValue_Base {
  __type: 'symbol'
  value: string
}

export interface NonSerializableValue_BigInt extends NonSerializableValue_Base {
  __type: 'bigint'
  value: string
}

export interface NonSerializableValue_RegExp extends NonSerializableValue_Base {
  __type: 'regexp'
  value: { source: string; flags: string }
}

export interface NonSerializableValue_Map extends NonSerializableValue_Base {
  __type: 'map'
  value: Array<[unknown, unknown]>
}

export interface NonSerializableValue_Set extends NonSerializableValue_Base {
  __type: 'set'
  value: unknown[]
}

export interface NonSerializableValue_WeakMap extends NonSerializableValue_Base {
  __type: 'weakmap'
  value: null
}

export interface NonSerializableValue_WeakSet extends NonSerializableValue_Base {
  __type: 'weakset'
  value: null
}

export interface NonSerializableValue_Date extends NonSerializableValue_Base {
  __type: 'date'
  value: string
}

export interface NonSerializableValue_ArrayBuffer extends NonSerializableValue_Base {
  __type: 'arraybuffer'
  value: { byteLength: number }
}

export interface NonSerializableValue_TypedArray extends NonSerializableValue_Base {
  __type: 'typedarray'
  value: { arrayType: string; byteLength: number }
}

export interface NonSerializableValue_Promise extends NonSerializableValue_Base {
  __type: 'promise'
  value: null
}

export interface NonSerializableValue_Error extends NonSerializableValue_Base {
  __type: 'error'
  value: { name: string; message: string; stack?: string }
}

export interface NonSerializableValue_Object extends NonSerializableValue_Base {
  __type: 'object'
  value: { constructorName: string; properties: unknown }
}

export type NonSerializableValue =
  | NonSerializableValue_Function
  | NonSerializableValue_Symbol
  | NonSerializableValue_BigInt
  | NonSerializableValue_RegExp
  | NonSerializableValue_Map
  | NonSerializableValue_Set
  | NonSerializableValue_WeakMap
  | NonSerializableValue_WeakSet
  | NonSerializableValue_Date
  | NonSerializableValue_ArrayBuffer
  | NonSerializableValue_TypedArray
  | NonSerializableValue_Promise
  | NonSerializableValue_Error
  | NonSerializableValue_Object

// Helper function to recursively serialize values that might contain non-serializable data
function safeSerializeRecursive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => safeSerializeRecursive(item))
  }
  if (isPlainObject(value)) {
    // Try to serialize with safeSerialize first
    const serialized = safeSerialize(value)
    if (serialized !== value) {
      // It was a non-serializable value, return the serialized version
      return serialized
    }
    // It's a regular object, recursively serialize its properties
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = safeSerializeRecursive(val)
    }
    return result
  }
  return value
}

// Custom error for serialization issues
class SerializationError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = 'SerializationError'
  }
}

// Custom placeholder class for binary data display
class BinaryDataPlaceholder {
  constructor(
    public readonly type: string,
    public readonly byteLength: number,
    public readonly arrayType?: string,
  ) {}

  toString() {
    if (this.arrayType) {
      return `[${this.arrayType} ${this.byteLength} bytes]`
    }
    return `[${this.type} ${this.byteLength} bytes]`
  }
}

export function safeSerialize(value: (...args: unknown[]) => unknown): NonSerializableValue_Function
export function safeSerialize(value: symbol): NonSerializableValue_Symbol
export function safeSerialize(value: bigint): NonSerializableValue_BigInt
export function safeSerialize(value: RegExp): NonSerializableValue_RegExp
export function safeSerialize(value: Map<unknown, unknown>): NonSerializableValue_Map
export function safeSerialize(value: Set<unknown>): NonSerializableValue_Set
export function safeSerialize(value: WeakMap<object, unknown>): NonSerializableValue_WeakMap
export function safeSerialize(value: WeakSet<object>): NonSerializableValue_WeakSet
export function safeSerialize(value: Date): NonSerializableValue_Date
export function safeSerialize(value: ArrayBuffer): NonSerializableValue_ArrayBuffer
export function safeSerialize(value: ArrayBufferView): NonSerializableValue_TypedArray
export function safeSerialize(value: Promise<unknown>): NonSerializableValue_Promise
export function safeSerialize(value: Error): NonSerializableValue_Error
export function safeSerialize<T>(value: T): T
export function safeSerialize(value: unknown) {
  if (typeof value === 'function') {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'function',
      value: `[Function: ${value.name || 'anonymous'}]`,
    } satisfies NonSerializableValue_Function
  } else if (typeof value === 'symbol') {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'symbol',
      value: value.description || '',
    } satisfies NonSerializableValue_Symbol
  } else if (typeof value === 'bigint') {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'bigint',
      value: String(value),
    } satisfies NonSerializableValue_BigInt
  } else if (value instanceof RegExp) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'regexp',
      value: { source: value.source, flags: value.flags },
    } satisfies NonSerializableValue_RegExp
  } else if (value instanceof Map) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'map',
      value: Array.from(value.entries()).map(([k, v]) => [
        safeSerializeRecursive(k),
        safeSerializeRecursive(v),
      ]),
    } satisfies NonSerializableValue_Map
  } else if (value instanceof Set) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'set',
      value: Array.from(value.values()).map((v) => safeSerializeRecursive(v)),
    } satisfies NonSerializableValue_Set
  } else if (value instanceof WeakMap) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'weakmap',
      value: null,
    } satisfies NonSerializableValue_WeakMap
  } else if (value instanceof WeakSet) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'weakset',
      value: null,
    } satisfies NonSerializableValue_WeakSet
  } else if (value instanceof Date) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'date',
      value: value.toISOString(),
    } satisfies NonSerializableValue_Date
  } else if (value instanceof ArrayBuffer) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'arraybuffer',
      value: { byteLength: value.byteLength },
    } satisfies NonSerializableValue_ArrayBuffer
  } else if (ArrayBuffer.isView(value)) {
    // Handle TypedArrays and DataView
    const typeName = value.constructor.name
    return {
      __custom: '@@pc-non-serializable',
      __type: 'typedarray',
      value: { arrayType: typeName, byteLength: value.byteLength },
    } satisfies NonSerializableValue_TypedArray
  } else if (value instanceof Promise) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'promise',
      value: null,
    } satisfies NonSerializableValue_Promise
  } else if (value instanceof Error) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'error',
      value: {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
    } satisfies NonSerializableValue_Error
  } else if (
    value &&
    typeof value === 'object' &&
    value.constructor &&
    value.constructor !== Object &&
    value.constructor !== Array
  ) {
    // Handle custom class instances
    const constructorName = value.constructor.name
    // Recursively serialize enumerable properties
    const properties = safeSerializeRecursive({ ...value })
    return {
      __custom: '@@pc-non-serializable',
      __type: 'object',
      value: { constructorName, properties },
    } satisfies NonSerializableValue_Object
  }

  // value that cannot be serialized
  return value
}

export function isNonSerializableValue(value: unknown): value is NonSerializableValue {
  return (
    !!value &&
    typeof value === 'object' &&
    '__custom' in value &&
    value.__custom === '@@pc-non-serializable' &&
    '__type' in value &&
    typeof value.__type === 'string' &&
    'value' in value
  )
}

function restoreClonedValue(value: NonSerializableValue) {
  if (value.__type === 'function') {
    return () => {}
  } else if (value.__type === 'symbol') {
    return Symbol(value.value)
  } else if (value.__type === 'bigint') {
    // BigInt() throws an error if the value is not a valid bigint string
    try {
      return BigInt(value.value)
    } catch (err) {
      return new SerializationError(`Invalid bigint value: ${value.value}`, err)
    }
  } else if (value.__type === 'regexp') {
    try {
      const { source, flags } = value.value
      return new RegExp(source, flags)
    } catch (err) {
      return new SerializationError(`Invalid regexp value: ${JSON.stringify(value.value)}`, err)
    }
  } else if (value.__type === 'map') {
    const entries = value.value.map(
      ([k, v]) => [restoreClonedDeep(k), restoreClonedDeep(v)] as const,
    )
    return new Map(entries)
  } else if (value.__type === 'set') {
    const values = value.value.map((v) => restoreClonedDeep(v))
    return new Set(values)
  } else if (value.__type === 'weakmap') {
    return new WeakMap()
  } else if (value.__type === 'weakset') {
    return new WeakSet()
  } else if (value.__type === 'date') {
    try {
      return new Date(value.value)
    } catch (err) {
      return new SerializationError(`Invalid date value: ${value.value}`, err)
    }
  } else if (value.__type === 'arraybuffer') {
    return new BinaryDataPlaceholder('ArrayBuffer', value.value.byteLength)
  } else if (value.__type === 'typedarray') {
    return new BinaryDataPlaceholder('TypedArray', value.value.byteLength, value.value.arrayType)
  } else if (value.__type === 'promise') {
    return Promise.resolve()
  } else if (value.__type === 'error') {
    const error = new Error(value.value.message)
    error.name = value.value.name
    if (value.value.stack) {
      error.stack = value.value.stack
    }
    return error
  } else if (value.__type === 'object') {
    const properties = restoreClonedDeep(value.value.properties)
    return typeof properties === 'object' && properties !== null
      ? { ...properties, __constructorName: value.value.constructorName }
      : { __constructorName: value.value.constructorName }
  }
  // @ts-expect-error: type of value is never
  return new SerializationError(`Unknown non-serializable value type: ${value.__type}`)
}

export function restoreClonedDeep<T>(val: T): T
export function restoreClonedDeep(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => restoreClonedDeep(item))
  }
  if (isNonSerializableValue(val)) {
    return restoreClonedValue(val)
  }
  if (val && typeof val === 'object' && !isError(val)) {
    return Object.fromEntries(
      Object.entries(val).map(([key, value]) => [key, restoreClonedDeep(value)]),
    )
  }
  return val
}

export function isError(err: unknown): err is Error {
  return 'isError' in Error && typeof Error.isError === 'function'
    ? Error.isError(err)
    : err instanceof Error
}
