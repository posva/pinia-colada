import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { delayLoadingRef } from './delay-loading'

describe('delayedLoadingRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function witchinEffect(fn: () => void) {
    return async () => {
      const effect = effectScope(true)
      await effect.run(fn)
      effect.stop()
    }
  }

  it(
    'contains an initial value of false',
    witchinEffect(() => {
      const isLoading = ref(false)
      const delayedRef = delayLoadingRef(isLoading, 100)
      expect(delayedRef.value).toBe(false)
    }),
  )

  it(
    'contains an initial value of true',
    witchinEffect(() => {
      const isLoading = ref(true)
      const delayedRef = delayLoadingRef(isLoading, 100)
      expect(delayedRef.value).toBe(true)
    }),
  )

  it(
    'sets the value to true after a delay',
    witchinEffect(async () => {
      const isLoading = ref(false)
      const delayedRef = delayLoadingRef(isLoading, 100)
      expect(delayedRef.value).toBe(false)

      isLoading.value = true
      expect(delayedRef.value).toBe(false)
      await vi.advanceTimersByTime(80)
      expect(delayedRef.value).toBe(false)

      await vi.advanceTimersByTime(101)
      expect(delayedRef.value).toBe(true)
    }),
  )

  it(
    'sets the value to false immediately',
    witchinEffect(async () => {
      const isLoading = ref(true)
      const delayedRef = delayLoadingRef(isLoading, 100)

      isLoading.value = false
      expect(delayedRef.value).toBe(false)
      await vi.advanceTimersByTime(101)
      expect(delayedRef.value).toBe(false)
    }),
  )

  it(
    'stops the timeout when the ref is set to false',
    witchinEffect(async () => {
      const isLoading = ref(false)
      const delayedRef = delayLoadingRef(isLoading, 100)

      isLoading.value = true
      await vi.advanceTimersByTime(80)
      isLoading.value = false
      expect(delayedRef.value).toBe(false)
      // even after waiting the delay
      await vi.advanceTimersByTime(101)
      expect(delayedRef.value).toBe(false)
    }),
  )
})
