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

export type NonSerializableValue =
  | NonSerializableValue_Function
  | NonSerializableValue_Symbol
  | NonSerializableValue_BigInt

export function safeSerialize(value: (...args: unknown[]) => unknown): NonSerializableValue_Function
export function safeSerialize(value: symbol): NonSerializableValue_Symbol
export function safeSerialize(value: bigint): NonSerializableValue_BigInt
// TODO: regex, map, set, weakmap, weakset, date, arraybuffer, typedarray, promise, custom class instances, error
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
