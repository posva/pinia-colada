import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import JsonItem from './JsonItem.vue'

describe('JsonItem', () => {
  it('opts into sticky keys recursively', async () => {
    const wrapper = mount(JsonItem, {
      props: {
        itemKey: 'root',
        value: { child: { value: 1 } },
        depth: 0,
        stickyKeys: true,
      },
    })

    expect(wrapper.classes()).toContain('json-item-sticky')

    await wrapper.get('[title="Click to expand"]').trigger('click')

    const child = wrapper.findAllComponents(JsonItem).find((item) => item.props('depth') === 1)
    expect(child?.props('stickyKeys')).toBe(true)
  })

  it('shows native value details as readonly', async () => {
    const value = restoreClonedDeep(
      serializeDevtoolsValue(new URL('https://pinia-colada.esm.dev/guide/?fixture=url')),
    )
    const wrapper = mount(JsonItem, {
      props: { itemKey: 'url', value, depth: 0 },
    })

    await wrapper.get('[title="Click to expand"]').trigger('click')

    expect(wrapper.text()).toContain('pathname:')
    expect(wrapper.find('[title="Edit value"]').exists()).toBe(false)
    expect(wrapper.find('[title="Edit as JSON"]').exists()).toBe(false)
  })

  it('keeps map values editable', async () => {
    const wrapper = mount(JsonItem, {
      props: { itemKey: 'map', value: new Map([['count', 1]]), depth: 0 },
    })

    await wrapper.get('[title="Click to expand"]').trigger('click')

    expect(wrapper.text()).toContain('count:')
    expect(wrapper.find('[title="Edit value"]').exists()).toBe(true)
  })

  it('copies a nested value as JSON', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    const wrapper = mount(JsonItem, {
      props: { itemKey: 'user', value: { name: 'Eduardo', tags: new Set(['a']) }, depth: 0 },
    })

    await wrapper.get('[title="Copy user as JSON"]').trigger('click')
    await flushPromises()

    expect(JSON.parse(writeText.mock.calls[0]![0])).toEqual({ name: 'Eduardo', tags: ['a'] })
    expect(wrapper.find('[title="Copied!"]').exists()).toBe(true)
  })
})
