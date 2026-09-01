import type { UseMutationEntryPayload } from './mutation-serialized'
import type { UseQueryEntryPayload } from './query-serialized'

function replaceEntry<T>(entries: T[], entry: T, getId: (entry: T) => string | number): void {
  const index = entries.findIndex((candidate) => getId(candidate) === getId(entry))
  if (index < 0) {
    entries.push(entry)
  } else {
    entries.splice(index, 1, entry)
  }
}

function removeEntry<T>(entries: T[], entry: T, getId: (entry: T) => string | number): void {
  const index = entries.findIndex((candidate) => getId(candidate) === getId(entry))
  if (index >= 0) {
    entries.splice(index, 1)
  }
}

export function replaceQueryEntry(
  entries: UseQueryEntryPayload[],
  entry: UseQueryEntryPayload,
): void {
  replaceEntry(entries, entry, (entry) => entry.keyHash)
}

export function removeQueryEntry(
  entries: UseQueryEntryPayload[],
  entry: UseQueryEntryPayload,
): void {
  removeEntry(entries, entry, (entry) => entry.keyHash)
}

export function replaceMutationEntry(
  entries: UseMutationEntryPayload[],
  entry: UseMutationEntryPayload,
): void {
  replaceEntry(entries, entry, (entry) => entry.id)
}

export function removeMutationEntry(
  entries: UseMutationEntryPayload[],
  entry: UseMutationEntryPayload,
): void {
  removeEntry(entries, entry, (entry) => entry.id)
}
