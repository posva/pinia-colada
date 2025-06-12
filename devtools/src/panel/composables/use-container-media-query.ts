import type { MaybeRefOrGetter } from 'vue'
import { computed, onScopeDispose, shallowRef, toValue, watchEffect } from 'vue'
import { useEventListener, useSupported } from '@vueuse/core'

// copied from match-container and adapted to shadow DOM
// import 'match-container'

const polyfill_key = 'bae45330cd3d4e0e96b60d26b57009b5'
let count = 0
// To guard against the case that this polyfill might be included more than once
// we must ensure that the ID generating function is a singleton
// to guarantee that no duplicated IDs are generated - however slim the chance might be.
// The IDs are unique in the current javascript runtime context.
// The IDs are constructed from the following parts:
// - a timestamp
// - the current value of a counter, incremented after each created ID
// - a static prefix
// Even if two IDs are generated within the same milisecond the increased counter ensures
// that they cannot clash.

const createID = () => `${polyfill_key}-${Date.now()}-${count++}`

class ContainerQueryListEvent extends Event {
  constructor(
    type: string,
    public container: string,
    public matches: boolean,
  ) {
    super(type)
  }
}

class ContainerQueryList extends EventTarget {
  #observedElement: HTMLElement
  #abortController = new AbortController()
  container: string
  matches: boolean

  constructor(element: HTMLElement, containerQueryString: string) {
    super()
    this.container = containerQueryString
    const unique_name = `container-query-observer-${createID()}`
    const markerAttribute = `data-${unique_name}`
    element.setAttribute(markerAttribute, '')
    const sentinelProperty = `--${unique_name}`
    const propertyCss = `
      @property ${sentinelProperty} {
        syntax: '<custom-ident>';
        inherits: false;
        initial-value: --false;
      }
`.trim()
    const containerCss = `
      @container ${containerQueryString} {
        [${markerAttribute}] {
          ${sentinelProperty}: --true;
        }
      }
`.trim()

    const rootNode = element.getRootNode()
    if (!(rootNode instanceof ShadowRoot) && !(rootNode instanceof Document)) {
      console.error(`root node of element isn't a ShadowRoot or Document`, rootNode)
      throw new TypeError('Root node must be a ShadowRoot or Document')
    }

    const propertyCssSheet = new CSSStyleSheet()
    propertyCssSheet.replaceSync(propertyCss)
    const doc = document
    doc.adoptedStyleSheets.push(propertyCssSheet)

    // FIXME: adoptedStyleSheets cannot be shared
    // the behavior breaks when using the PiP
    if (rootNode.ownerDocument === document) {
      const containerQuerySheet = new CSSStyleSheet()
      containerQuerySheet.replaceSync(containerCss)
      rootNode.adoptedStyleSheets.push(containerQuerySheet)
    }

    const style = getComputedStyle(element)
    this.matches = style.getPropertyValue(sentinelProperty) === '--true'

    this.#observedElement = element
    this.#startObserving(sentinelProperty, containerQueryString, element)
  }

  #startObserving(
    sentinelProperty: string,
    containerQueryString: string,
    observedElement: HTMLElement,
  ) {
    const _previousValues: Record<string, string | undefined> = {}

    observedElement.style.setProperty('transition', `${sentinelProperty} 0.001ms step-start`)
    observedElement.style.setProperty('transition-behavior', 'allow-discrete')
    observedElement.addEventListener(
      'transitionrun',
      (transitionEvent) => {
        if (observedElement === transitionEvent.target) {
          const computedStyle = getComputedStyle(observedElement)
          const changes: Record<string, string | undefined> = {}
          const currentValue = computedStyle.getPropertyValue(sentinelProperty)
          const previousValue = _previousValues[sentinelProperty]
          const hasChanged = currentValue !== previousValue

          if (hasChanged) {
            changes[sentinelProperty] = currentValue
            _previousValues[sentinelProperty] = currentValue
            if (sentinelProperty in changes) {
              const matches = changes[sentinelProperty] === '--true'
              this.matches = matches
              // raise 'change' event
              const event = new ContainerQueryListEvent('change', containerQueryString, matches)
              this.dispatchEvent(event)
            }
          }
        }
      },
      { signal: this.#abortController.signal },
    )

    // init _previousValues
    const computedStyle = getComputedStyle(observedElement)
    const currentValue = computedStyle.getPropertyValue(sentinelProperty)
    _previousValues[sentinelProperty] = currentValue
  }

  dispose() {
    this.#observedElement.style.removeProperty('transition')
    this.#observedElement.style.removeProperty('transition-behavior')
    // stop the event listener
    this.#abortController.abort()
  }
}

if (typeof window !== 'undefined') {
  if (!HTMLElement.prototype.matchContainer) {
    HTMLElement.prototype.matchContainer = function matchContainer(
      this: HTMLElement,
      containerQueryString: string,
    ) {
      return new ContainerQueryList(this, containerQueryString)
    }
  }
}

// For some reason, the types are not being picked up from the package
declare global {
  interface HTMLElement {
    matchContainer: (containerQueryString: string) => ContainerQueryList
  }
}

/**
 * Reactive Container Media Query.
 *
 * @param query - The container query string to match against.
 * @param target - The target element to match the query against.
 */
export function useContainerMediaQuery(
  query: MaybeRefOrGetter<string>,
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const isSupported = useSupported(
    () => typeof document !== 'undefined' && typeof document.body.matchContainer === 'function',
  )
  const mediaQuery = shallowRef<ContainerQueryList>()
  const matches = shallowRef(false)

  watchEffect(() => {
    if (!isSupported.value) return

    mediaQuery.value?.dispose()

    mediaQuery.value = toValue(target)?.matchContainer(toValue(query))
    matches.value = !!mediaQuery.value?.matches
  })

  onScopeDispose(() => {
    mediaQuery.value?.dispose()
  })

  useEventListener(
    mediaQuery,
    'change',
    (event: ContainerQueryListEvent) => {
      matches.value = event.matches
    },
    { passive: true },
  )

  return computed(() => matches.value)
}
