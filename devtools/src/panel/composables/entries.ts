import type { EntryKey } from '@pinia/colada'
import { miniJsonParse } from '@pinia/colada-devtools/shared'
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

export function useFormattedKey(entryKey: MaybeRefOrGetter<EntryKey>): ComputedRef<string[]>
export function useFormattedKey(
  entryKey: MaybeRefOrGetter<EntryKey | undefined>,
): ComputedRef<string[] | undefined>
export function useFormattedKey(
  entryKey: MaybeRefOrGetter<EntryKey | undefined>,
): ComputedRef<string[] | undefined> {
  // TODO: colorize the output based on the type of value
  return computed(() => {
    return toValue(entryKey)?.map((rawValue) => {
      let value: unknown = rawValue
      try {
        value = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
      } catch {
        // If parsing fails, keep the original value
      }
      return value && typeof value === 'object' ? miniJsonParse(value) : String(value)
    })
  })
}
