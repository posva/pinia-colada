import type { ComponentInternalInstance } from 'vue'

export function findVueComponents(
  root: HTMLElement,
  uids: number[],
): Record<number, ComponentInternalInstance | undefined> {
  if (uids.length === 0) {
    return {}
  }

  // console.time('find elements')
  const tw = document.createTreeWalker(root.ownerDocument.body, NodeFilter.SHOW_ELEMENT)

  // no | undefined because we only want to allow setting components
  const observingComponents = {} as Record<number, ComponentInternalInstance>

  const observersIds = new Set<number>(uids)

  while (tw.nextNode()) {
    const node = tw.currentNode
    if (!(node instanceof HTMLElement)) {
      continue
    }
    // NOTE: these properties are private API for devtools
    const component = ((node as any).__vueParentComponent
      || (node as any).__vue_app_?._instance) as ComponentInternalInstance | null
    if (!component) {
      continue
    }

    if (observersIds.has(component.uid)) {
      observingComponents[component.uid] = component
      observersIds.delete(component.uid)

      // can't find more
      if (observersIds.size === 0) {
        break
      }
    }
  }

  // if observersIds.size > 0, we didn't find all components

  return observingComponents
}
