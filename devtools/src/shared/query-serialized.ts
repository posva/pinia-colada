import type { UseQueryEntry, UseQueryOptionsWithDefaults } from '@pinia/colada'
import { toValue } from 'vue'

export interface UseQueryEntryPayload {
  key: UseQueryEntry['key']
  state: UseQueryEntry['state']['value']
  asyncStatus: UseQueryEntry['asyncStatus']['value']

  active: UseQueryEntry['active']
  stale: UseQueryEntry['stale']
  when: UseQueryEntry['when']
  options: UseQueryEntryPayloadOptions | null
  deps: UseQueryEntryPayloadDep[]
  gcTimeout: number | null
}

export interface UseQueryEntryPayloadDepComponent {
  type: 'component'
  uid: number
  name: string | undefined
}

export interface UseQueryEntryPayloadDepEffect {
  type: 'effect'
  active: boolean
  detached: boolean
}

export type UseQueryEntryPayloadDep =
  | UseQueryEntryPayloadDepComponent
  | UseQueryEntryPayloadDepEffect

export interface UseQueryEntryPayloadOptions extends Pick<UseQueryOptionsWithDefaults, 'gcTime' | 'staleTime' | 'refetchOnMount' | 'refetchOnReconnect' | 'refetchOnWindowFocus'> {
  enabled: boolean
}

export function createQueryEntryPayload(entry: UseQueryEntry): UseQueryEntryPayload {
  return {
    key: entry.key,
    state: entry.state.value,
    asyncStatus: entry.asyncStatus.value,

    active: entry.active,
    stale: entry.stale,
    when: entry.when,
    options: entry.options && {
      staleTime: entry.options.staleTime,
      gcTime: entry.options.gcTime,
      refetchOnMount: entry.options.refetchOnMount,
      refetchOnReconnect: entry.options.refetchOnReconnect,
      refetchOnWindowFocus: entry.options.refetchOnWindowFocus,
      enabled: toValue(entry.options.enabled),
    },
    deps: Array.from(entry.deps).map((dep) =>
      'uid' in dep
        ? {
            type: 'component',
            uid: dep.uid,
            name: dep.type.displayName ?? dep.type.name,
          }
        : {
            type: 'effect',
            active: dep.active,
            detached: dep.detached,
          },
    ),
    gcTimeout: typeof entry.gcTimeout === 'number' ? (entry.gcTimeout as number) : null,
  }
}
