import { beforeEach, describe, it, expect, vi } from 'vitest'
import { ref, nextTick, defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useInfiniteQuery } from './infinite-query'
import { PiniaColada } from './pinia-colada'
import { createPinia } from 'pinia'

describe('useInfiniteQuery', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  it('creates isolated cache entries for different keys', async () => {
    const queryParam = ref('a')
    let pagesArg: any

    const mockQuery = vi.fn().mockImplementation(async (pages) => {
      pagesArg = pages
      // Simulate different responses based on the current key
      if (queryParam.value === 'a') {
        return { data: `result-a-${pages.page}` }
      } else {
        return { data: `result-b-${pages.page}` }
      }
    })

    const wrapper = mount(defineComponent({
      render: () => null,
      setup() {
        return useInfiniteQuery({
          key: () => ['test', queryParam.value],
          query: mockQuery,
          initialPage: () => ({ results: [], page: 1 }),
          merge: (pages, newData) => ({
            results: [...pages.results, newData.data],
            page: pages.page + 1,
          }),
        })
      },
    }), {
      global: {
        plugins: [createPinia(), PiniaColada],
      },
    })

    const query = wrapper.vm

    // First, load some data for key 'a'
    await query.loadMore()
    await flushPromises()
    expect(pagesArg).toEqual({ results: [], page: 1 })

    await query.loadMore()
    await flushPromises()
    expect(pagesArg).toEqual({ results: ['result-a-1'], page: 2 })

    // Now change the key to 'b'
    queryParam.value = 'b'
    await nextTick()

    // Load data for key 'b' - this should start fresh with the initial page
    await query.loadMore()
    await flushPromises()

    // FIXED: The pages argument for key 'b' should be { results: [], page: 1 }
    expect(pagesArg).toEqual({ results: [], page: 1 })

    // Load more for key 'b'
    await query.loadMore()
    await flushPromises()
    expect(pagesArg).toEqual({ results: ['result-b-1'], page: 2 })

    // Switch back to key 'a' - should restore cached 'a' data
    queryParam.value = 'a'
    await nextTick()

    await query.loadMore()
    await flushPromises()

    // Should continue from where 'a' left off
    expect(pagesArg).toEqual({ results: ['result-a-1', 'result-a-2'], page: 3 })

    expect(mockQuery).toHaveBeenCalledTimes(5)
  })

  it('handles multiple concurrent infinite queries with different keys', async () => {
    let pagesArgA: any
    let pagesArgB: any

    const mockQueryA = vi.fn().mockImplementation(async (pages) => {
      pagesArgA = pages
      return { data: `a-${pages.page}` }
    })

    const mockQueryB = vi.fn().mockImplementation(async (pages) => {
      pagesArgB = pages
      return { data: `b-${pages.page}` }
    })

    const wrapperA = mount(defineComponent({
      render: () => null,
      setup() {
        return useInfiniteQuery({
          key: ['concurrent', 'a'],
          query: mockQueryA,
          initialPage: () => ({ items: [], page: 1 }),
          merge: (pages, newData) => ({
            items: [...pages.items, newData.data],
            page: pages.page + 1,
          }),
        })
      },
    }), {
      global: {
        plugins: [createPinia(), PiniaColada],
      },
    })

    const wrapperB = mount(defineComponent({
      render: () => null,
      setup() {
        return useInfiniteQuery({
          key: ['concurrent', 'b'],
          query: mockQueryB,
          initialPage: () => ({ items: [], page: 1 }),
          merge: (pages, newData) => ({
            items: [...pages.items, newData.data],
            page: pages.page + 1,
          }),
        })
      },
    }), {
      global: {
        plugins: [createPinia(), PiniaColada],
      },
    })

    const queryA = wrapperA.vm
    const queryB = wrapperB.vm

    // Load data for both queries
    await queryA.loadMore()
    await queryB.loadMore()
    await flushPromises()

    expect(pagesArgA).toEqual({ items: [], page: 1 })
    expect(pagesArgB).toEqual({ items: [], page: 1 })

    // Load more for query A
    await queryA.loadMore()
    await flushPromises()
    expect(pagesArgA).toEqual({ items: ['a-1'], page: 2 })

    // Load more for query B
    await queryB.loadMore()
    await flushPromises()
    expect(pagesArgB).toEqual({ items: ['b-1'], page: 2 })

    // Load one more for each to verify isolation
    await queryA.loadMore()
    await queryB.loadMore()
    await flushPromises()

    expect(pagesArgA).toEqual({ items: ['a-1', 'a-2'], page: 3 })
    expect(pagesArgB).toEqual({ items: ['b-1', 'b-2'], page: 3 })

    expect(mockQueryA).toHaveBeenCalledTimes(3)
    expect(mockQueryB).toHaveBeenCalledTimes(3)
  })
})
