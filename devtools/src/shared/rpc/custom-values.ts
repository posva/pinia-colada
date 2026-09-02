import { isPlainObject, VALUE_DETAILS, VALUE_DISPLAY, type ValueDisplayToken } from '../json'

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

export interface NonSerializableValue_BoxedNumber extends NonSerializableValue_Base {
  __type: 'boxednumber'
  value: number
}

export interface NonSerializableValue_BoxedString extends NonSerializableValue_Base {
  __type: 'boxedstring'
  value: string
}

export interface NonSerializableValue_RegExp extends NonSerializableValue_Base {
  __type: 'regexp'
  value: { source: string; flags: string }
}

export interface NonSerializableValue_URL extends NonSerializableValue_Base {
  __type: 'url'
  value: string
}

export interface NonSerializableValue_URLSearchParams extends NonSerializableValue_Base {
  __type: 'urlsearchparams'
  value: string
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
  value: string | null
}

export interface NonSerializableValue_ArrayBuffer extends NonSerializableValue_Base {
  __type: 'arraybuffer'
  value: ArrayBufferMetadata
}

interface ArrayBufferMetadata {
  byteLength: number
  detached: boolean
  maxByteLength: number
  resizable: boolean
}

export interface NonSerializableValue_Blob extends NonSerializableValue_Base {
  __type: 'blob'
  value: { size: number; type: string }
}

export interface NonSerializableValue_File extends NonSerializableValue_Base {
  __type: 'file'
  value: {
    name: string
    size: number
    type: string
    lastModified: number
    webkitRelativePath: string
  }
}

export interface NonSerializableValue_TypedArray extends NonSerializableValue_Base {
  __type: 'typedarray'
  value: {
    arrayType: string
    byteLength: number
    byteOffset: number
    length?: number
    buffer: ArrayBufferMetadata
  }
}

export interface NonSerializableValue_Promise extends NonSerializableValue_Base {
  __type: 'promise'
  value:
    | { status: 'pending' }
    | { status: 'fulfilled'; value: unknown }
    | { status: 'rejected'; reason: unknown }
}

export interface NonSerializableValue_Error extends NonSerializableValue_Base {
  __type: 'error'
  value: { name: string; message: string; stack?: string; cause?: unknown; errors?: unknown[] }
}

export interface NonSerializableValue_Object extends NonSerializableValue_Base {
  __type: 'object'
  value: { constructorName: string; properties: unknown }
}

export interface NonSerializableValue_NullPrototypeObject extends NonSerializableValue_Base {
  __type: 'nullprototypeobject'
  value: { properties: unknown }
}

export interface NonSerializableValue_Reference extends NonSerializableValue_Base {
  __type: 'reference'
  value: { id: number; circular: boolean }
}

export type NonSerializableValue =
  | NonSerializableValue_Function
  | NonSerializableValue_Symbol
  | NonSerializableValue_BigInt
  | NonSerializableValue_BoxedNumber
  | NonSerializableValue_BoxedString
  | NonSerializableValue_RegExp
  | NonSerializableValue_URL
  | NonSerializableValue_URLSearchParams
  | NonSerializableValue_Map
  | NonSerializableValue_Set
  | NonSerializableValue_WeakMap
  | NonSerializableValue_WeakSet
  | NonSerializableValue_Date
  | NonSerializableValue_ArrayBuffer
  | NonSerializableValue_Blob
  | NonSerializableValue_File
  | NonSerializableValue_TypedArray
  | NonSerializableValue_Promise
  | NonSerializableValue_Error
  | NonSerializableValue_Object
  | NonSerializableValue_NullPrototypeObject
  | NonSerializableValue_Reference

const CUSTOM_VALUE_SERIALIZE = Symbol.for('@pinia/colada-devtools/custom-value-serialize')

interface RestoredCustomValue {
  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue
}

export function isRestoredCustomValue(value: unknown): value is RestoredCustomValue {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    CUSTOM_VALUE_SERIALIZE in value
  )
}

function getCustomValueType(value: unknown): NonSerializableValue['__type'] | undefined {
  if (isRestoredCustomValue(value)) return value[CUSTOM_VALUE_SERIALIZE]().__type
  if (typeof value === 'function') return 'function'
  if (typeof value === 'symbol') return 'symbol'
  if (typeof value === 'bigint') return 'bigint'
  if (value instanceof Number) return 'boxednumber'
  if (value instanceof String) return 'boxedstring'
  if (value instanceof RegExp) return 'regexp'
  if (value instanceof URL) return 'url'
  if (value instanceof URLSearchParams) return 'urlsearchparams'
  if (value instanceof Map) return 'map'
  if (value instanceof Set) return 'set'
  if (value instanceof WeakMap) return 'weakmap'
  if (value instanceof WeakSet) return 'weakset'
  if (value instanceof Date) return 'date'
  if (value instanceof ArrayBuffer) return 'arraybuffer'
  if (typeof File !== 'undefined' && value instanceof File) return 'file'
  if (typeof Blob !== 'undefined' && value instanceof Blob) return 'blob'
  if (ArrayBuffer.isView(value)) return 'typedarray'
  if (value instanceof Promise) return 'promise'
  if (value instanceof Error) return 'error'
  if (!value || typeof value !== 'object') return
  if (Object.getPrototypeOf(value) === null) return 'nullprototypeobject'
  if (
    isPlainObject(value) &&
    '__constructorName' in value &&
    typeof value.__constructorName === 'string'
  ) {
    return 'object'
  }
  if (value.constructor && value.constructor !== Object && value.constructor !== Array) {
    return 'object'
  }
}

/**
 * Replaces transported display values with the native values from the live cache.
 * Plain objects and arrays are traversed so regular edits are retained.
 */
export function restoreOriginalValues<T>(edited: T, original: unknown): T {
  return restoreOriginalValuesRecursive(edited, original, 0)
}

function restoreOriginalValuesRecursive<T>(edited: T, original: unknown, depth: number): T {
  const editedType = getCustomValueType(edited)
  const originalType = getCustomValueType(original)

  if (editedType === 'reference') return original as T
  if (editedType && editedType === originalType) {
    if (
      (editedType === 'object' || editedType === 'nullprototypeobject') &&
      edited &&
      original &&
      typeof edited === 'object' &&
      typeof original === 'object'
    ) {
      for (const [key, value] of Object.entries(edited)) {
        ;(original as Record<string, unknown>)[key] = restoreOriginalValues(
          value,
          (original as Record<string, unknown>)[key],
        )
      }
    }
    return original as T
  }

  if (Array.isArray(edited) && Array.isArray(original)) {
    for (let index = 0; index < edited.length; index++) {
      if (index in edited) {
        const restoredValue = restoreOriginalValuesRecursive(
          edited[index],
          original[index],
          depth + 1,
        )
        edited[index] = restoredValue
        original[index] = restoredValue
      }
    }
    original.length = edited.length
    if (depth > 1) return original as T
  } else if (isPlainObject(edited) && isPlainObject(original)) {
    const editedRecord = edited as Record<string, unknown>
    const originalRecord = original as Record<string, unknown>
    for (const [key, value] of Object.entries(edited)) {
      const restoredValue = restoreOriginalValuesRecursive(value, originalRecord[key], depth + 1)
      editedRecord[key] = restoredValue
      originalRecord[key] = restoredValue
    }
    if (depth > 1) return original as T
  }

  return edited
}

// Helper function to recursively serialize values that might contain non-serializable data
function safeSerializeRecursive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => safeSerializeRecursive(item))
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === null) {
    return safeSerialize(value)
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = safeSerializeRecursive(val)
    }
    return result
  }
  return safeSerialize(value)
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
    private readonly details?: Record<string, unknown>,
    private readonly serialized?:
      | NonSerializableValue_ArrayBuffer
      | NonSerializableValue_TypedArray,
  ) {}

  toString() {
    return `[${this.type} ${this.byteLength} bytes]`
  }

  [VALUE_DISPLAY](): ValueDisplayToken[] {
    return binaryDisplayTokens(this.type, this.byteLength)
  }

  [VALUE_DETAILS]() {
    return this.details
  }

  [CUSTOM_VALUE_SERIALIZE]() {
    return this.serialized!
  }
}

class BlobPlaceholder {
  constructor(private readonly metadata: NonSerializableValue_Blob['value']) {}

  toString() {
    return `[Blob ${this.metadata.size} bytes]`
  }

  [VALUE_DISPLAY]() {
    return binaryDisplayTokens('Blob', this.metadata.size)
  }

  [VALUE_DETAILS]() {
    return { size: this.metadata.size, type: this.metadata.type }
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_Blob {
    return { __custom: '@@pc-non-serializable', __type: 'blob', value: this.metadata }
  }
}

class FilePlaceholder {
  constructor(private readonly metadata: NonSerializableValue_File['value']) {}

  toString() {
    return `[File ${this.metadata.name} ${this.metadata.size} bytes]`
  }

  [VALUE_DISPLAY](): ValueDisplayToken[] {
    return [
      { text: '[', class: 'text-(--devtools-syntax-gray)' },
      { text: 'File', class: 'text-(--devtools-syntax-object-blue)' },
      { text: ` ${this.metadata.name} ` },
      { text: String(this.metadata.size), class: 'text-(--devtools-syntax-orange)' },
      { text: ' bytes]', class: 'text-(--devtools-syntax-gray)' },
    ]
  }

  [VALUE_DETAILS]() {
    return {
      name: this.metadata.name,
      size: this.metadata.size,
      type: this.metadata.type,
      lastModified: this.metadata.lastModified,
      lastModifiedDate: new Date(this.metadata.lastModified),
      webkitRelativePath: this.metadata.webkitRelativePath,
    }
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_File {
    return { __custom: '@@pc-non-serializable', __type: 'file', value: this.metadata }
  }
}

type PromiseState = 'pending' | 'fulfilled' | 'rejected'

export const PROMISE_STATE = Symbol.for('@pinia/colada-devtools/promise-state')
export const PROMISE_RESULT = Symbol.for('@pinia/colada-devtools/promise-result')

type TrackedPromise<T> = Promise<T> & {
  [PROMISE_STATE]: PromiseState
  [PROMISE_RESULT]?: unknown
}

export function trackPromise<T>(promise: Promise<T>): Promise<T> {
  const trackedPromise = promise as TrackedPromise<T>
  trackedPromise[PROMISE_STATE] = 'pending'
  promise.then(
    (value) => {
      trackedPromise[PROMISE_STATE] = 'fulfilled'
      trackedPromise[PROMISE_RESULT] = value
    },
    (reason: unknown) => {
      trackedPromise[PROMISE_STATE] = 'rejected'
      trackedPromise[PROMISE_RESULT] = reason
    },
  )
  return promise
}

class PromisePlaceholder {
  constructor(private readonly state: NonSerializableValue_Promise['value']) {}

  toString() {
    return `[Promise ${this.state.status}]`
  }

  [VALUE_DISPLAY](): ValueDisplayToken[] {
    const statusClass =
      this.state.status === 'fulfilled'
        ? 'text-(--devtools-syntax-green)'
        : this.state.status === 'rejected'
          ? 'text-(--devtools-syntax-red)'
          : 'text-(--devtools-syntax-orange)'
    return [
      { text: '[', class: 'text-(--devtools-syntax-gray)' },
      { text: 'Promise', class: 'text-(--devtools-syntax-object-blue)' },
      { text: ' ' },
      { text: this.state.status, class: statusClass },
      { text: ']', class: 'text-(--devtools-syntax-gray)' },
    ]
  }

  [VALUE_DETAILS]() {
    if (this.state.status === 'fulfilled') {
      return { status: this.state.status, value: restoreClonedDeep(this.state.value) }
    }
    if (this.state.status === 'rejected') {
      return { status: this.state.status, reason: restoreClonedDeep(this.state.reason) }
    }
    return { status: this.state.status }
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_Promise {
    return { __custom: '@@pc-non-serializable', __type: 'promise', value: this.state }
  }
}

class URLPlaceholder {
  private readonly url: URL

  constructor(value: string) {
    this.url = new URL(value)
  }

  toString() {
    return `URL(${this.url.href})`
  }

  [VALUE_DISPLAY](): ValueDisplayToken[] {
    return objectCallDisplayTokens('URL', this.url.href)
  }

  [VALUE_DETAILS]() {
    return {
      href: this.url.href,
      origin: this.url.origin,
      protocol: this.url.protocol,
      username: this.url.username,
      password: this.url.password,
      host: this.url.host,
      hostname: this.url.hostname,
      port: this.url.port,
      pathname: this.url.pathname,
      search: this.url.search,
      searchParams: new URLSearchParamsPlaceholder(this.url.searchParams.toString()),
      hash: this.url.hash,
    }
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_URL {
    return { __custom: '@@pc-non-serializable', __type: 'url', value: this.url.href }
  }
}

class URLSearchParamsPlaceholder {
  private readonly params: URLSearchParams

  constructor(value: string) {
    this.params = new URLSearchParams(value)
  }

  toString() {
    return `URLSearchParams(${this.params.toString()})`
  }

  [VALUE_DISPLAY](): ValueDisplayToken[] {
    return objectCallDisplayTokens('URLSearchParams', this.params.toString())
  }

  [VALUE_DETAILS]() {
    return {
      size: this.params.size,
      entries: Array.from(this.params.entries()),
    }
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_URLSearchParams {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'urlsearchparams',
      value: this.params.toString(),
    }
  }
}

function objectCallDisplayTokens(type: string, value: string): ValueDisplayToken[] {
  return [
    { text: type, class: 'text-(--devtools-syntax-object-blue)' },
    { text: '(', class: 'text-(--devtools-syntax-gray)' },
    { text: value, class: 'text-(--devtools-syntax-green)' },
    { text: ')', class: 'text-(--devtools-syntax-gray)' },
  ]
}

function binaryDisplayTokens(type: string, byteLength: number): ValueDisplayToken[] {
  return [
    { text: '[', class: 'text-(--devtools-syntax-gray)' },
    { text: type, class: 'text-(--devtools-syntax-object-blue)' },
    { text: ' ' },
    { text: String(byteLength), class: 'text-(--devtools-syntax-orange)' },
    { text: ' bytes]', class: 'text-(--devtools-syntax-gray)' },
  ]
}

function getArrayBufferMetadata(value: ArrayBuffer): ArrayBufferMetadata {
  return {
    byteLength: value.byteLength,
    detached: value.detached,
    maxByteLength: value.maxByteLength,
    resizable: value.resizable,
  }
}

function restoreArrayBufferPlaceholder(value: ArrayBufferMetadata) {
  return new BinaryDataPlaceholder(
    'ArrayBuffer',
    value.byteLength,
    { ...value },
    {
      __custom: '@@pc-non-serializable',
      __type: 'arraybuffer',
      value,
    },
  )
}

class ReferencePlaceholder {
  constructor(
    public readonly id: number,
    public readonly circular: boolean,
  ) {}

  toString() {
    return `[${this.circular ? 'Circular' : 'Reference'} *${this.id}]`
  }

  [CUSTOM_VALUE_SERIALIZE](): NonSerializableValue_Reference {
    return serializeReference(this.id, this.circular)
  }
}

export function serializeReference(id: number, circular = false): NonSerializableValue_Reference {
  return {
    __custom: '@@pc-non-serializable',
    __type: 'reference',
    value: { id, circular },
  }
}

export function safeSerialize(value: (...args: unknown[]) => unknown): NonSerializableValue_Function
export function safeSerialize(value: symbol): NonSerializableValue_Symbol
export function safeSerialize(value: bigint): NonSerializableValue_BigInt
export function safeSerialize(value: RegExp): NonSerializableValue_RegExp
export function safeSerialize(value: URL): NonSerializableValue_URL
export function safeSerialize(value: URLSearchParams): NonSerializableValue_URLSearchParams
export function safeSerialize(value: Map<unknown, unknown>): NonSerializableValue_Map
export function safeSerialize(value: Set<unknown>): NonSerializableValue_Set
export function safeSerialize(value: WeakMap<object, unknown>): NonSerializableValue_WeakMap
export function safeSerialize(value: WeakSet<object>): NonSerializableValue_WeakSet
export function safeSerialize(value: Date): NonSerializableValue_Date
export function safeSerialize(value: ArrayBuffer): NonSerializableValue_ArrayBuffer
export function safeSerialize(value: Blob): NonSerializableValue_Blob
export function safeSerialize(value: File): NonSerializableValue_File
export function safeSerialize(value: ArrayBufferView): NonSerializableValue_TypedArray
export function safeSerialize(value: Promise<unknown>): NonSerializableValue_Promise
export function safeSerialize(value: Error): NonSerializableValue_Error
export function safeSerialize<T>(value: T): T
export function safeSerialize(value: unknown) {
  if (isRestoredCustomValue(value)) {
    return value[CUSTOM_VALUE_SERIALIZE]()
  } else if (typeof value === 'function') {
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
  } else if (value instanceof Number) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'boxednumber',
      value: value.valueOf(),
    } satisfies NonSerializableValue_BoxedNumber
  } else if (value instanceof String) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'boxedstring',
      value: value.valueOf(),
    } satisfies NonSerializableValue_BoxedString
  } else if (value instanceof RegExp) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'regexp',
      value: { source: value.source, flags: value.flags },
    } satisfies NonSerializableValue_RegExp
  } else if (value instanceof URL) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'url',
      value: value.href,
    } satisfies NonSerializableValue_URL
  } else if (value instanceof URLSearchParams) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'urlsearchparams',
      value: value.toString(),
    } satisfies NonSerializableValue_URLSearchParams
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
      value: Number.isNaN(value.getTime()) ? null : value.toISOString(),
    } satisfies NonSerializableValue_Date
  } else if (value instanceof ArrayBuffer) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'arraybuffer',
      value: getArrayBufferMetadata(value),
    } satisfies NonSerializableValue_ArrayBuffer
  } else if (typeof File !== 'undefined' && value instanceof File) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'file',
      value: {
        name: value.name,
        size: value.size,
        type: value.type,
        lastModified: value.lastModified,
        webkitRelativePath: value.webkitRelativePath || '',
      },
    } satisfies NonSerializableValue_File
  } else if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'blob',
      value: { size: value.size, type: value.type },
    } satisfies NonSerializableValue_Blob
  } else if (ArrayBuffer.isView(value)) {
    // Handle TypedArrays and DataView
    const typeName = value.constructor.name
    return {
      __custom: '@@pc-non-serializable',
      __type: 'typedarray',
      value: {
        arrayType: typeName,
        byteLength: value.byteLength,
        byteOffset: value.byteOffset,
        ...('length' in value && typeof value.length === 'number' && { length: value.length }),
        buffer: getArrayBufferMetadata(value.buffer as ArrayBuffer),
      },
    } satisfies NonSerializableValue_TypedArray
  } else if (value instanceof Promise) {
    const trackedPromise = value as Partial<TrackedPromise<unknown>>
    const status = trackedPromise[PROMISE_STATE] || 'pending'
    return {
      __custom: '@@pc-non-serializable',
      __type: 'promise',
      value:
        status === 'fulfilled'
          ? { status, value: safeSerializeRecursive(trackedPromise[PROMISE_RESULT]) }
          : status === 'rejected'
            ? { status, reason: safeSerializeRecursive(trackedPromise[PROMISE_RESULT]) }
            : { status },
    } satisfies NonSerializableValue_Promise
  } else if (value instanceof Error) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'error',
      value: {
        name: value.name,
        message: value.message,
        stack: value.stack,
        ...('cause' in value && { cause: safeSerializeRecursive(value.cause) }),
        ...(value instanceof AggregateError && {
          errors: value.errors.map((error) => safeSerializeRecursive(error)),
        }),
      },
    } satisfies NonSerializableValue_Error
  } else if (value && typeof value === 'object' && Object.getPrototypeOf(value) === null) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'nullprototypeobject',
      value: { properties: safeSerializeRecursive({ ...value }) },
    } satisfies NonSerializableValue_NullPrototypeObject
  } else if (
    isPlainObject(value) &&
    '__constructorName' in value &&
    typeof value.__constructorName === 'string'
  ) {
    return {
      __custom: '@@pc-non-serializable',
      __type: 'object',
      value: {
        constructorName: value.__constructorName,
        properties: safeSerializeRecursive({ ...value }),
      },
    } satisfies NonSerializableValue_Object
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
    const restoredFunction = () => {}
    const name = /^\[Function: (.*)]$/.exec(value.value)?.[1]
    if (name) Object.defineProperty(restoredFunction, 'name', { value: name })
    return restoredFunction
  } else if (value.__type === 'symbol') {
    return Symbol(value.value)
  } else if (value.__type === 'bigint') {
    // BigInt() throws an error if the value is not a valid bigint string
    try {
      return BigInt(value.value)
    } catch (err) {
      return new SerializationError(`Invalid bigint value: ${value.value}`, err)
    }
  } else if (value.__type === 'boxednumber') {
    return Object(value.value)
  } else if (value.__type === 'boxedstring') {
    return Object(value.value)
  } else if (value.__type === 'regexp') {
    try {
      const { source, flags } = value.value
      return new RegExp(source, flags)
    } catch (err) {
      return new SerializationError(`Invalid regexp value: ${JSON.stringify(value.value)}`, err)
    }
  } else if (value.__type === 'url') {
    try {
      return new URLPlaceholder(value.value)
    } catch (err) {
      return new SerializationError(`Invalid URL value: ${value.value}`, err)
    }
  } else if (value.__type === 'urlsearchparams') {
    return new URLSearchParamsPlaceholder(value.value)
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
    if (value.value === null) return new Date(Number.NaN)
    try {
      return new Date(value.value)
    } catch (err) {
      return new SerializationError(`Invalid date value: ${value.value}`, err)
    }
  } else if (value.__type === 'arraybuffer') {
    return restoreArrayBufferPlaceholder(value.value)
  } else if (value.__type === 'blob') {
    return new BlobPlaceholder(value.value)
  } else if (value.__type === 'file') {
    return new FilePlaceholder(value.value)
  } else if (value.__type === 'typedarray') {
    return new BinaryDataPlaceholder(
      value.value.arrayType,
      value.value.byteLength,
      {
        buffer: restoreArrayBufferPlaceholder(value.value.buffer),
        byteLength: value.value.byteLength,
        byteOffset: value.value.byteOffset,
        ...('length' in value.value && { length: value.value.length }),
      },
      value,
    )
  } else if (value.__type === 'promise') {
    return new PromisePlaceholder(value.value)
  } else if (value.__type === 'error') {
    const options = {
      ...('cause' in value.value && { cause: restoreClonedDeep(value.value.cause) }),
    }
    const error = value.value.errors
      ? new AggregateError(
          value.value.errors.map((error) => restoreClonedDeep(error)),
          value.value.message,
          options,
        )
      : new Error(value.value.message, options)
    error.name = value.value.name
    if (value.value.stack) {
      error.stack = value.value.stack
    }
    return error
  } else if (value.__type === 'object') {
    const properties = restoreClonedDeep(value.value.properties)
    const restoredObject =
      typeof properties === 'object' && properties !== null ? { ...properties } : {}
    Object.defineProperty(restoredObject, '__constructorName', {
      value: value.value.constructorName,
    })
    return restoredObject
  } else if (value.__type === 'nullprototypeobject') {
    return Object.assign(Object.create(null), restoreClonedDeep(value.value.properties))
  } else if (value.__type === 'reference') {
    return new ReferencePlaceholder(value.value.id, value.value.circular)
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
