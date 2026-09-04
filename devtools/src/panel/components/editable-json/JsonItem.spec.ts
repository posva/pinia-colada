import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import JsonItem from './JsonItem.vue'

describe('JsonItem', () => {
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
})
