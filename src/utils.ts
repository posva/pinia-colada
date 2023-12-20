import { onScopeDispose } from 'vue'

export interface GeneralEventListener<E = Event> {
  (evt: E): void
}

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
 *
 * @param target
 * @param event
 * @param listener
 * @param options
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
  listener: GeneralEventListener,
  options?: boolean | AddEventListenerOptions
) {
  target.addEventListener(event, listener, options)
  onScopeDispose(() => {
    target.removeEventListener(event, listener)
  })
}
