import { onScopeDispose, shallowRef } from 'vue'

// share this variable among all instances
const now = shallowRef(performance.timeOrigin + performance.now())
let intervalId: ReturnType<typeof setInterval> | undefined
let useCount = 0

/**
 * Reactive and shared `performance.now()` that updates on the specified interval.
 */
export function usePerformanceNow() {
  if (!intervalId) {
    intervalId = setInterval(() => {
      now.value = performance.timeOrigin + performance.now()
    }, 50)
  }

  useCount++
  onScopeDispose(() => {
    if (--useCount <= 0) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  })

  return now
}
