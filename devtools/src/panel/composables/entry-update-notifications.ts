import type { DataStateStatus } from '@pinia/colada'
import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

interface EntryUpdate {
  id: string | number
  when: number
  status: DataStateStatus
}

export function useEntryUpdateNotifications(
  entry: MaybeRefOrGetter<EntryUpdate | null>,
  isDataOpen: Readonly<Ref<boolean>>,
  isErrorOpen: Readonly<Ref<boolean>>,
) {
  const hasNewData = ref(false)
  const hasNewError = ref(false)

  watch(
    () => {
      const value = toValue(entry)
      return value ? ([value.id, value.when, value.status] as const) : null
    },
    (update, previousUpdate) => {
      // Selecting an entry establishes a baseline; its existing state isn't new.
      if (!update || !previousUpdate || update[0] !== previousUpdate[0]) {
        hasNewData.value = false
        hasNewError.value = false
        return
      }

      // Ignore panel refreshes that didn't replace the entry state.
      if (update[1] === previousUpdate[1] && update[2] === previousUpdate[2]) return

      if (update[2] === 'success') {
        hasNewData.value = !isDataOpen.value
        hasNewError.value = false
      } else if (update[2] === 'error') {
        hasNewError.value = !isErrorOpen.value
      } else {
        // Pending entries have neither current data nor an error to review.
        hasNewData.value = false
        hasNewError.value = false
      }
    },
  )

  watch(isDataOpen, (isOpen) => {
    if (isOpen) hasNewData.value = false
  })
  watch(isErrorOpen, (isOpen) => {
    if (isOpen) hasNewError.value = false
  })

  return { hasNewData, hasNewError }
}
