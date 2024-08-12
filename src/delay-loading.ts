import type { ComputedRef, Ref } from 'vue'
import { computed, onScopeDispose, ref, toValue, watch } from 'vue'

/**
 * Creates a delayed computed ref from an existing ref, computed, or getter. Use this to delay a loading state (`isLoading`, `isLoading`) to avoid flickering.
 *
 * @example
 * ```ts
 * const { isLoading: _isLoading } = useQuery({ queryKey: 'todos', queryFn: fetchTodos })
 * const isLoading = delayLoadingRef(_isLoading, 300)
 * ```
 *
 * @param refOrGetter - ref or getter to delay
 * @param delay - delay in ms
 */
export function delayLoadingRef(
  refOrGetter: Ref<boolean> | ComputedRef<boolean> | (() => boolean),
  delay = 300,
) {
  const isDelayElapsed = ref(toValue(refOrGetter))
  const newRef = computed(() => toValue(refOrGetter) && isDelayElapsed.value)
  let timeout: ReturnType<typeof setTimeout> | undefined
  const stop = () => {
    clearTimeout(timeout)
  }
  watch(refOrGetter, (value) => {
    stop()
    if (value) {
      isDelayElapsed.value = false
      timeout = setTimeout(() => {
        isDelayElapsed.value = true
      }, delay)
    }
  })

  onScopeDispose(stop)

  return newRef
}
