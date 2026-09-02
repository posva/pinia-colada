import type { InPageChannelProtocol } from 'devframe/in-page-channel'
import type {
  DataState,
  EntryKey,
  UseMutationEntryFilter,
  UseQueryEntryFilter,
} from '@pinia/colada'
import type { UseMutationEntryPayload, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'

/** Channel name, namespaced with the devframe id. */
export const PINIA_COLADA_CHANNEL = 'pinia-colada:devtools'

/** How long the page script waits for Pinia to be installed. */
export const PINIA_COLADA_WAIT_TIMEOUT = 15_000

export interface PiniaColadaCacheState {
  queries: UseQueryEntryPayload[]
  mutations: UseMutationEntryPayload[]
}

export interface PiniaColadaChannelProtocol extends InPageChannelProtocol {
  pageScript: {
    'queries:clear': (filters?: UseQueryEntryFilter) => void
    'queries:refetch': (key: EntryKey) => void
    'queries:invalidate': (key: EntryKey) => void
    'queries:reset': (key: EntryKey) => void
    'queries:set:state': (key: EntryKey, state: DataState<unknown, unknown, unknown>) => void
    'queries:simulate:loading': (key: EntryKey) => void
    'queries:simulate:loading:stop': (key: EntryKey) => void
    'queries:simulate:error': (key: EntryKey) => void
    'queries:simulate:error:stop': (key: EntryKey) => void
    'mutations:clear': (filters?: UseMutationEntryFilter) => void
    'mutations:remove': (id: number) => void
    'mutations:simulate:loading': (id: number) => void
    'mutations:simulate:loading:stop': (id: number) => void
    'mutations:simulate:error': (id: number) => void
    'mutations:simulate:error:stop': (id: number) => void
    'mutations:replay': (id: number) => void
  }
  panel: Record<string, never>
  sharedStates: {
    cache: PiniaColadaCacheState
  }
}
