import { computed, getCurrentScope, onScopeDispose } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import type { EntryKey } from './entry-options'
import type { EntryNodeKey } from './tree-map'
import type { QueryCache } from './query-store'
import type { UseQueryOptions } from './query-options'

/**
 * Adds an event listener to Window that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof WindowEventMap>(
  target: Window,
  event: E,
  listener: (this: Window, ev: WindowEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions,
): void

/**
 * Adds an event listener to Document that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof DocumentEventMap>(
  target: Document,
  event: E,
  listener: (this: Document, ev: DocumentEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions,
): void

export function useEventListener(
  target: Document | Window | EventTarget,
  event: string,
  listener: (this: EventTarget, ev: Event) => any,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(event, listener, options)
  if (getCurrentScope()) {
    onScopeDispose(() => {
      target.removeEventListener(event, listener)
    })
  }
}

export const IS_CLIENT = typeof window !== 'undefined'

/**
 * Type that represents a value that can be an array or a single value.
 * @internal
 */
export type _MaybeArray<T> = T | T[]

/**
 * Type that represents a value that can be a function or a single value. Used for `defineQuery()` and
 * `defineMutation()`.
 * @internal
 */
export type _MaybeFunction<T, Args extends any[] = []> = T | ((...args: Args) => T)

/**
 * Transforms a value or a function that returns a value to a value.
 * @param valFn either a value or a function that returns a value
 * @param args  arguments to pass to the function if `valFn` is a function
 */
export function toValueWithArgs<T, Args extends any[]>(
  valFn: T | ((...args: Args) => T),
  ...args: Args
): T {
  return typeof valFn === 'function' ? (valFn as (...args: Args) => T)(...args) : valFn
}

/**
 * Type that represents a value that can be a promise or a single value.
 * @internal
 */
export type _Awaitable<T> = T | Promise<T>

/**
 * Flattens an object type for readability.
 * @internal
 */
export type _Simplify<T> = { [K in keyof T]: T[K] }

/**
 * Converts a value to an array if necessary.
 *
 * @param value - value to convert
 */
export const toArray = <T>(value: _MaybeArray<T>): T[] => (Array.isArray(value) ? value : [value])

export type _JSONPrimitive = string | number | boolean | null | undefined

/**
 * Utility type to represent a flat object that can be stringified with `JSON.stringify` no matter the order of keys.
 * @internal
 */
export interface _ObjectFlat {
  [key: string]: _JSONPrimitive | Array<_JSONPrimitive>
}

/**
 * Stringifies an object no matter the order of keys. This is used to create a hash for a given object. It only works
 * with flat objects. It can contain arrays of primitives only. `undefined` values are skipped.
 *
 * @param obj - object to stringify
 */
export function stringifyFlatObject(obj: _ObjectFlat | _JSONPrimitive): string {
  return obj && typeof obj === 'object' ? JSON.stringify(obj, Object.keys(obj).sort()) : String(obj)
}

/**
 * Creates a {@link QueryCache}'s `caches` key from an entry's {@link UseQueryOptions#key}.
 * @param key - key of the entry
 */
export const toCacheKey = (key: EntryKey): EntryNodeKey[] => key.map(stringifyFlatObject)

/**
 * Merges two types when the second one can be null | undefined. Allows to safely use the returned type for { ...a,
 * ...undefined, ...null }
 * @internal
 */
export type _MergeObjects<Obj, MaybeNull> = MaybeNull extends undefined | null | void
  ? Obj
  : _Simplify<Obj & MaybeNull>

/**
 * @internal
 */
export const noop = () => {}

/**
 * Wraps a getter to be used as a ref. This is useful when you want to use a getter as a ref but you need to modify the
 * value.
 *
 * @internal
 * @param other - getter of the ref to compute
 * @returns a wrapper around a writable getter that can be used as a ref
 */
export const computedRef = <T>(other: () => Ref<T>): ShallowRef<T> =>
  computed({
    get: () => other().value,
    set: (value) => (other().value = value),
  })

/**
 * Renames a property in an object type.
 */
export type _RenameProperty<T, Key extends keyof T, NewKey extends string> = {
  [P in keyof T as P extends Key ? NewKey : P]: T[P]
}

/**
 * Type safe version of `Object.assign` that allows to set all properties of a reactive object at once. Used to set
 * {@link DataState} properties in a type safe way.
 */
export const setReactiveValue = Object.assign as <T>(value: T, ...args: T[]) => T

/**
 * To avoid using `{}`
 * @internal
 */
export interface _EmptyObject {}

/**
 * Compares two arrays to check if they are the same. Used for keys.
 *
 * @param arr1 - first array to compare
 * @param arr2 - second array to compare
 */
export function isSameArray(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) return false
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false
  }
  return true
}

/**
 * Dev only warning that is only shown once.
 */
const warnedMessages = new Set<string>()

/**
 * Warns only once. This should only be used in dev
 * @param message - Message to show
 * @param id - Unique id for the message, defaults to the message
 */
export function warnOnce(message: string, id: string = message) {
  if (warnedMessages.has(id)) return
  warnedMessages.add(id)
  console.warn(`[@pinia/colada]: ${message}`)
}

/**
 * Removes the `MaybeRefOrGetter` wrapper from all fields of an object.
 * @internal
 */
export type _RemoveMaybeRef<T> = {
  [K in keyof T]: T[K] extends MaybeRefOrGetter<infer U>
    ? MaybeRefOrGetter<U> extends T[K]
      ? U
      : T[K]
    : T[K]
}
