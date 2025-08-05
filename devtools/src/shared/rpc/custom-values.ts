export interface NonSerializableValue_Base {
  __custom: '@@pc-non-serializable'
  __type: string
  value: string
}

export interface NonSerializableValue_Function extends NonSerializableValue_Base {
  __type: 'function'
}

export interface NonSerializableValue_Symbol extends NonSerializableValue_Base {
  __type: 'symbol'
}

export interface NonSerializableValue_BigInt extends NonSerializableValue_Base {
  __type: 'bigint'
}

export interface NonSerializableValue_RegExp extends NonSerializableValue_Base {
  __type: 'regexp'
}

export interface NonSerializableValue_Map extends NonSerializableValue_Base {
  __type: 'map'
}

export interface NonSerializableValue_Set extends NonSerializableValue_Base {
  __type: 'set'
}

export interface NonSerializableValue_WeakMap extends NonSerializableValue_Base {
  __type: 'weakmap'
}

export interface NonSerializableValue_WeakSet extends NonSerializableValue_Base {
  __type: 'weakset'
}

export interface NonSerializableValue_Date extends NonSerializableValue_Base {
  __type: 'date'
}

export interface NonSerializableValue_ArrayBuffer extends NonSerializableValue_Base {
  __type: 'arraybuffer'
}

export interface NonSerializableValue_TypedArray extends NonSerializableValue_Base {
  __type: 'typedarray'
  arrayType: string
}

export interface NonSerializableValue_Promise extends NonSerializableValue_Base {
  __type: 'promise'
}

export interface NonSerializableValue_Error extends NonSerializableValue_Base {
  __type: 'error'
  name: string
  stack?: string
}

export interface NonSerializableValue_Object extends NonSerializableValue_Base {
  __type: 'object'
  constructorName: string
  properties: string
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
      value: JSON.stringify({ source: value.source, flags: value.flags }),
    } satisfies NonSerializableValue_RegExp
  } else if (value instanceof Map) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'map',
      value: JSON.stringify(Array.from(value.entries())),
    } satisfies NonSerializableValue_Map
  } else if (value instanceof Set) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'set',
      value: JSON.stringify(Array.from(value.values())),
    } satisfies NonSerializableValue_Set
  } else if (value instanceof WeakMap) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'weakmap',
      value: '[WeakMap]',
    } satisfies NonSerializableValue_WeakMap
  } else if (value instanceof WeakSet) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'weakset',
      value: '[WeakSet]',
    } satisfies NonSerializableValue_WeakSet
  } else if (value instanceof Date) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'date',
      value: value.toISOString(),
    } satisfies NonSerializableValue_Date
  } else if (value instanceof ArrayBuffer) {
    // Convert ArrayBuffer to base64 string
    const bytes = new Uint8Array(value)
    const base64 = btoa(String.fromCharCode(...bytes))
    return {
      __custom: '@@pc-non-serializable',
      __type: 'arraybuffer',
      value: base64,
    } satisfies NonSerializableValue_ArrayBuffer
  } else if (ArrayBuffer.isView(value)) {
    // Handle TypedArrays and DataView
    const typeName = value.constructor.name
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    const base64 = btoa(String.fromCharCode(...bytes))
    return {
      __custom: '@@pc-non-serializable',
      __type: 'typedarray',
      arrayType: typeName,
      value: base64,
    } satisfies NonSerializableValue_TypedArray
  } else if (value instanceof Promise) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'promise',
      value: '[Promise]',
    } satisfies NonSerializableValue_Promise
  } else if (value instanceof Error) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'error',
      name: value.name,
      value: value.message,
      stack: value.stack,
    } satisfies NonSerializableValue_Error
  } else if (value && typeof value === 'object' && value.constructor && value.constructor !== Object && value.constructor !== Array) {
    // Handle custom class instances
    const constructorName = value.constructor.name
    try {
      // Only serialize enumerable properties
      const properties = JSON.stringify(value)
      return {
        __custom: '@@pc-non-serializable',
        __type: 'object',
        constructorName,
        value: `[${constructorName}]`,
        properties,
      } satisfies NonSerializableValue_Object
    } catch {
      return {
        __custom: '@@pc-non-serializable',
        __type: 'object',
        constructorName,
        value: `[${constructorName}]`,
        properties: '{}',
      } satisfies NonSerializableValue_Object
    }
  }

  // value that cannot be serialized
  return value
}

function isNonSerializableValue(value: unknown): value is NonSerializableValue {
  return (
    !!value &&
    typeof value === 'object' &&
    '__custom' in value &&
    value.__custom === '@@pc-non-serializable' &&
    '__type' in value &&
    typeof value.__type === 'string' &&
    'value' in value &&
    typeof value.value === 'string'
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
      console.warn(`[🍹]: Invalid bigint value: ${value.value}`, err)
      return 0n
    }
  } else if (value.__type === 'regexp') {
    try {
      const { source, flags } = JSON.parse(value.value)
      return new RegExp(source, flags)
    } catch (err) {
      console.warn(`[🍹]: Invalid regexp value: ${value.value}`, err)
      return /.*/
    }
  } else if (value.__type === 'map') {
    try {
      const entries = JSON.parse(value.value)
      return new Map(entries)
    } catch (err) {
      console.warn(`[🍹]: Invalid map value: ${value.value}`, err)
      return new Map()
    }
  } else if (value.__type === 'set') {
    try {
      const values = JSON.parse(value.value)
      return new Set(values)
    } catch (err) {
      console.warn(`[🍹]: Invalid set value: ${value.value}`, err)
      return new Set()
    }
  } else if (value.__type === 'weakmap') {
    return new WeakMap()
  } else if (value.__type === 'weakset') {
    return new WeakSet()
  } else if (value.__type === 'date') {
    try {
      return new Date(value.value)
    } catch (err) {
      console.warn(`[🍹]: Invalid date value: ${value.value}`, err)
      return new Date()
    }
  } else if (value.__type === 'arraybuffer') {
    try {
      const base64 = value.value
      const binaryString = atob(base64)
      const buffer = new ArrayBuffer(binaryString.length)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i)
      }
      return buffer
    } catch (err) {
      console.warn(`[🍹]: Invalid arraybuffer value: ${value.value}`, err)
      return new ArrayBuffer(0)
    }
  } else if (value.__type === 'typedarray') {
    try {
      const typedArrayValue = value as NonSerializableValue_TypedArray
      const base64 = typedArrayValue.value
      const binaryString = atob(base64)
      const buffer = new ArrayBuffer(binaryString.length)
      const view = new Uint8Array(buffer)
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i)
      }

      // Create the appropriate TypedArray based on the arrayType
      switch (typedArrayValue.arrayType) {
        case 'Int8Array': return new Int8Array(buffer)
        case 'Uint8Array': return new Uint8Array(buffer)
        case 'Uint8ClampedArray': return new Uint8ClampedArray(buffer)
        case 'Int16Array': return new Int16Array(buffer)
        case 'Uint16Array': return new Uint16Array(buffer)
        case 'Int32Array': return new Int32Array(buffer)
        case 'Uint32Array': return new Uint32Array(buffer)
        case 'Float32Array': return new Float32Array(buffer)
        case 'Float64Array': return new Float64Array(buffer)
        case 'BigInt64Array': return new BigInt64Array(buffer)
        case 'BigUint64Array': return new BigUint64Array(buffer)
        case 'DataView': return new DataView(buffer)
        default:
          console.warn(`[🍹]: Unknown typed array type: ${typedArrayValue.arrayType}`)
          return new Uint8Array(buffer)
      }
    } catch (err) {
      console.warn(`[🍹]: Invalid typedarray value: ${value.value}`, err)
      return new Uint8Array(0)
    }
  } else if (value.__type === 'promise') {
    return Promise.resolve()
  } else if (value.__type === 'error') {
    try {
      const errorValue = value as NonSerializableValue_Error
      const error = new Error(errorValue.value)
      error.name = errorValue.name
      if (errorValue.stack) {
        error.stack = errorValue.stack
      }
      return error
    } catch (err) {
      console.warn(`[🍹]: Could not restore error: ${value.value}`, err)
      return new Error(value.value)
    }
  } else if (value.__type === 'object') {
    try {
      const objectValue = value as NonSerializableValue_Object
      const properties = JSON.parse(objectValue.properties)
      return { ...properties, __constructorName: objectValue.constructorName }
    } catch (err) {
      console.warn(`[🍹]: Could not restore object: ${value.value}`, err)
      return {}
    }
  }
  // @ts-expect-error: type of value is never
  console.warn('Unknown non-serializable value type:', value.__type)
  // as is
  return value
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
