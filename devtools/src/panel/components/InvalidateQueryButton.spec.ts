import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InvalidateQueryButton from './InvalidateQueryButton.vue'
import { panelChannel } from '../panel-channel'

vi.mock('../panel-channel', () => ({
  panelChannel: { call: vi.fn() },
}))

describe('InvalidateQueryButton', () => {
  beforeEach(() => {
    vi.mocked(panelChannel.call).mockClear()
  })

  it('invalidates only the current query from the button', async () => {
    const wrapper = mount(InvalidateQueryButton, {
      props: { entryKey: ['users', 2, 'posts'] },
    })

    await wrapper.get('button').trigger('click')

    expect(panelChannel.call).toHaveBeenCalledTimes(1)
    expect(panelChannel.call).toHaveBeenCalledWith('queries:invalidate', {
      key: ['users', 2, 'posts'],
      exact: true,
    })
  })

  it('lists every key from the root to the full key', () => {
    const wrapper = mount(InvalidateQueryButton, {
      props: { entryKey: ['users', 2, 'posts'] },
    })

    const options = wrapper.findAll('option').filter((option) => option.element.value !== '')
    expect(options.map((option) => option.text())).toEqual([
      'users',
      'users / 2',
      'users / 2 / posts',
    ])
  })

  it('invalidates every query under the picked key', async () => {
    const wrapper = mount(InvalidateQueryButton, {
      props: { entryKey: ['users', 2, 'posts'] },
    })
    const select = wrapper.get('select')

    await select.setValue('1')
    expect(panelChannel.call).toHaveBeenLastCalledWith('queries:invalidate', { key: ['users'] })
    // back to the placeholder so the same key can be picked again
    expect(select.element.value).toBe('')

    await select.setValue('2')
    expect(panelChannel.call).toHaveBeenLastCalledWith('queries:invalidate', {
      key: ['users', 2],
    })
    expect(panelChannel.call).toHaveBeenCalledTimes(2)
  })
})
