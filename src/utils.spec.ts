import { effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delayLoadingRef, stringifyFlatObject } from './utils'

describe('utils', () => {
  describe('stringifyFlatObject', () => {
    it('stringifies an object no matter the order of keys', () => {
      expect(stringifyFlatObject({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
      expect(stringifyFlatObject({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    })

    it('works with all primitives', () => {
      expect(stringifyFlatObject({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
      expect(stringifyFlatObject({ a: '1', b: '2' })).toBe('{"a":"1","b":"2"}')
      expect(stringifyFlatObject({ a: true, b: false })).toBe(
        '{"a":true,"b":false}',
      )
      expect(stringifyFlatObject({ a: null })).toBe('{"a":null}')
    })

    it('works with arrays', () => {
      expect(stringifyFlatObject({ a: [1, 2], b: [3, 4] })).toBe(
        '{"a":[1,2],"b":[3,4]}',
      )
      expect(stringifyFlatObject({ b: [1, 2], a: [3, 4] })).toBe(
        '{"a":[3,4],"b":[1,2]}',
      )
    })
  })

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
})
