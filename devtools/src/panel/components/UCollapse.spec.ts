import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import UCollapse from './UCollapse.vue'

function rectangle(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 500,
    width: 500,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

function transitionEnd(element: Element) {
  const event = new TransitionEvent('transitionend', { bubbles: true })
  // Happy DOM doesn't initialize propertyName from TransitionEventInit like browsers do.
  Object.defineProperty(event, 'propertyName', { value: 'grid-template-rows' })
  element.dispatchEvent(event)
}

function createPane() {
  const pane = document.createElement('div')
  pane.className = 'splitpanes__pane'
  pane.scrollTop = 40
  document.body.appendChild(pane)

  const scrollTo = vi.spyOn(pane, 'scrollTo')
  vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue(rectangle(100, 500))

  return { pane, scrollTo }
}

function mountCollapse(sectionBottom = 700) {
  const { pane, scrollTo } = createPane()

  const wrapper = mount(UCollapse, {
    attachTo: pane,
    props: { scrollOnOpen: true },
    slots: { default: '<div class="content">Data</div>' },
  })
  vi.spyOn(wrapper.element, 'getBoundingClientRect').mockReturnValue(rectangle(300, sectionBottom))

  return { pane, scrollTo, wrapper }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('UCollapse scrolling', () => {
  it('aligns an overflowing section after the user opens it', async () => {
    const { scrollTo, wrapper } = mountCollapse()
    const input = wrapper.get('input')

    await input.setValue(false)
    transitionEnd(wrapper.element)
    await input.setValue(true)
    transitionEnd(wrapper.element)

    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 240, behavior: 'smooth' })
  })

  it('leaves the pane alone when the opened section fits', async () => {
    const { scrollTo, wrapper } = mountCollapse(450)
    const input = wrapper.get('input')

    await input.setValue(false)
    transitionEnd(wrapper.element)
    await input.setValue(true)
    transitionEnd(wrapper.element)

    expect(scrollTo).toHaveBeenCalledTimes(0)
  })

  it('leaves the pane alone when the user scrolls during expansion', async () => {
    const { pane, scrollTo, wrapper } = mountCollapse()
    const input = wrapper.get('input')

    await input.setValue(false)
    transitionEnd(wrapper.element)
    await input.setValue(true)
    pane.scrollTop = 80
    transitionEnd(wrapper.element)

    expect(scrollTo).toHaveBeenCalledTimes(0)
  })

  it('ignores transitions from content inside the section', async () => {
    const { scrollTo, wrapper } = mountCollapse()
    const input = wrapper.get('input')

    await input.setValue(false)
    transitionEnd(wrapper.element)
    await input.setValue(true)
    transitionEnd(wrapper.get('.content').element)

    expect(scrollTo).toHaveBeenCalledTimes(0)
  })

  it('scrolls a nested history entry only once', async () => {
    const { pane, scrollTo } = createPane()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(UCollapse, { scrollOnOpen: true }, () =>
            h(UCollapse, { scrollOnOpen: true }, () => 'History data'),
          ),
      }),
      { attachTo: pane },
    )
    const historyEntry = wrapper.findAllComponents(UCollapse).at(-1)!
    vi.spyOn(historyEntry.element, 'getBoundingClientRect').mockReturnValue(rectangle(300, 700))
    const input = historyEntry.get('input')

    await input.setValue(false)
    transitionEnd(historyEntry.element)
    await input.setValue(true)
    transitionEnd(historyEntry.element)

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })
})
