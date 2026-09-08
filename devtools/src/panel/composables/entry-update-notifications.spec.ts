import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useEntryUpdateNotifications } from './entry-update-notifications'

describe('useEntryUpdateNotifications', () => {
  it('marks new data and clears the marker when Data opens', async () => {
    const entry = ref({ id: 'query', when: 1, status: 'success' as const })
    const isDataOpen = ref(false)
    const isErrorOpen = ref(false)
    const notifications = useEntryUpdateNotifications(entry, isDataOpen, isErrorOpen)

    entry.value = { id: 'query', when: 2, status: 'success' }
    await nextTick()
    expect(notifications.hasNewData.value).toBe(true)

    isDataOpen.value = true
    await nextTick()
    expect(notifications.hasNewData.value).toBe(false)
  })

  it('marks a new error and clears obsolete errors after success', async () => {
    const entry = ref<{ id: string; when: number; status: 'pending' | 'error' | 'success' }>({
      id: 'query',
      when: 1,
      status: 'pending',
    })
    const notifications = useEntryUpdateNotifications(entry, ref(false), ref(false))

    entry.value = { id: 'query', when: 2, status: 'error' }
    await nextTick()
    expect(notifications.hasNewError.value).toBe(true)

    entry.value = { id: 'query', when: 3, status: 'success' }
    await nextTick()
    expect(notifications.hasNewError.value).toBe(false)
    expect(notifications.hasNewData.value).toBe(true)
  })

  it('does not mark updates that are already visible', async () => {
    const entry = ref<{ id: number; when: number; status: 'pending' | 'success' }>({
      id: 1,
      when: 1,
      status: 'pending',
    })
    const notifications = useEntryUpdateNotifications(entry, ref(true), ref(true))

    entry.value = { id: 1, when: 2, status: 'success' }
    await nextTick()
    expect(notifications.hasNewData.value).toBe(false)
  })

  it('resets markers when another entry is selected', async () => {
    const entry = ref({ id: 1, when: 1, status: 'success' as const })
    const notifications = useEntryUpdateNotifications(entry, ref(false), ref(false))

    entry.value = { id: 1, when: 2, status: 'success' }
    await nextTick()
    expect(notifications.hasNewData.value).toBe(true)

    entry.value = { id: 2, when: 3, status: 'success' }
    await nextTick()
    expect(notifications.hasNewData.value).toBe(false)
  })
})
