import { onScopeDispose } from 'vue'

/**
 * Adds an event listener to Window that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof WindowEventMap>(
  target: Window,
  event: E,
  listener: (this: Window, ev: WindowEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions
): void

/**
 * Adds an event listener to Document that is automatically removed on scope dispose.
 */
export function useEventListener<E extends keyof DocumentEventMap>(
  target: Document,
  event: E,
  listener: (this: Document, ev: DocumentEventMap[E]) => any,
  options?: boolean | AddEventListenerOptions
): void

export function useEventListener(
  target: Document | Window | EventTarget,
  event: string,
  listener: (this: EventTarget, ev: Event) => any,
  options?: boolean | AddEventListenerOptions
) {
  target.addEventListener(event, listener, options)
  onScopeDispose(() => {
    target.removeEventListener(event, listener)
  })
}

export const IS_CLIENT = typeof window !== 'undefined'

export type _MaybeArray<T> = T | T[]

/**
 * Converts a value to an array if necessary.
 *
 * @param value - value to convert
 */
export const toArray = <T>(value: _MaybeArray<T>): T[] =>
  Array.isArray(value) ? value : [value]

type _JSONPrimitive = string | number | boolean | null

export interface _Object {
  [key: string]: _JSONPrimitive | Array<_JSONPrimitive>
}

/**
 * Stringifies an object no matter the order of keys. This is used to create a hash for a given object. It only works
 * with flat objects. It can contain arrays of primitives only.
 *
 * @param obj - object to stringify
 */
export function stringifyFlatObject(obj: _Object): string {
  return JSON.stringify(obj, Object.keys(obj).sort())
}
