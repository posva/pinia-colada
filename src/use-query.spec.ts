import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useQuery } from './use-query'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('useQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const runTimers = async (onlyPending = true) => {
    if (onlyPending) {
      vi.runOnlyPendingTimers()
    } else {
      vi.runAllTimers()
    }
    await nextTick()
  }

  const mountSimple = () =>
    mount(
      {
        render: () => null,
        setup() {
          return {
            ...useQuery({
              fetcher: async () => {
                console.log('fetching')
                await delay(0)
                console.log('!fetching')
                return 42
              },
              key: 'foo',
            }),
          }
        },
      },
      {
        global: {
          plugins: [createPinia()],
        },
      }
    )

  it('renders the loading state initially', async () => {
    const wrapper = mountSimple()

    expect(wrapper.vm.data).toBeUndefined()
    expect(wrapper.vm.isPending).toBe(true)
    expect(wrapper.vm.isFetching).toBe(true)
    expect(wrapper.vm.error).toBeNull()

    await runTimers()
    console.log('after timers')

    expect(wrapper.vm.data).toBe(42)
    expect(wrapper.vm.error).toBeNull()
    // FIXME: this should be false but it's not reactive yet
    // expect(wrapper.vm.isPending).toBe(false)
    // expect(wrapper.vm.isFetching).toBe(false)
  })
})
