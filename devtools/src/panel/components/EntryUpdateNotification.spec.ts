import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EntryUpdateNotification from './EntryUpdateNotification.vue'

describe('EntryUpdateNotification', () => {
  it('renders subtle markers for new data and errors', async () => {
    const wrapper = mount(EntryUpdateNotification, {
      props: { type: 'data' },
    })

    expect(wrapper.get('[role="status"]').attributes('title')).toBe('New data')
    expect(wrapper.get('[role="status"]').classes()).toContain('text-info-600')

    await wrapper.setProps({ type: 'error' })
    expect(wrapper.get('[role="status"]').attributes('title')).toBe('New error')
    expect(wrapper.get('[role="status"]').classes()).toContain('text-error-600')
  })
})
