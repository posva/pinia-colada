import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryPlugin } from './query-plugin'
import { defineQuery } from './define-query'
import { useQueryCache } from './query-store'

describe('gcTime', async () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    enableAutoUnmount(afterEach)

  it('should delete the cache of an inactive query once the gcTime is elapsed', async () => {
    const useTodoList = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
      gcTime: 1000,
    })

    let queryCache!: ReturnType<typeof useQueryCache>

    mount(
      {
        setup() {
          useTodoList()
          queryCache = useQueryCache()
        },
      },
      {
        global: {
          plugins: [createPinia(), QueryPlugin],
        },
      },
    )
    vi.advanceTimersByTime(999)
    expect(queryCache.caches.get(['todos'])).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(queryCache.caches.get(['todos'])).toBeUndefined()
  })

  it('should extend the gcTime of the query if a new fetch happens', async () => {
    const useTodoList = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
      gcTime: 1000,
    })

    let queryCache!: ReturnType<typeof useQueryCache>

    mount(
      {
        setup() {
          useTodoList()
          queryCache = useQueryCache()
        },
      },
      {
        global: {
          plugins: [createPinia(), QueryPlugin],
        },
      },
    )

    vi.advanceTimersByTime(999)
    expect(queryCache.caches.get(['todos'])).toBeDefined()

    await queryCache.refresh(queryCache.caches.get(['todos']) as any) // TODO: improve typing
    vi.advanceTimersByTime(1)
    expect(queryCache.caches.get(['todos'])).toBeDefined()
    vi.advanceTimersByTime(1000)
    expect(queryCache.caches.get(['todos'])).toBeUndefined()
  })
})
