import { Mock, vi } from 'vitest'
import { nextTick } from 'vue'

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const runTimers = async (onlyPending = true) => {
  if (onlyPending) {
    await vi.runOnlyPendingTimersAsync()
  } else {
    // vi.runAllTimers()
    await vi.runAllTimersAsync()
  }
  await nextTick()
}

export function isSpy(fn: any): fn is Mock {
  return (
    typeof fn === 'function' &&
    'mock' in fn &&
    typeof fn.mock === 'object' &&
    Array.isArray(fn.mock.calls)
  )
}