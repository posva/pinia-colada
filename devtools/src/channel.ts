import type { InPageChannelProtocol } from 'devframe/in-page-channel'
import type {
  DevtoolsProcedures,
  UseMutationEntryPayload,
  UseQueryEntryPayload,
} from '@pinia/colada-devtools/shared'

/** Channel name, namespaced with the devframe id. */
export const PINIA_COLADA_CHANNEL = 'pinia-colada:devtools'

/** How long the page script waits for Pinia to be installed. */
export const PINIA_COLADA_WAIT_TIMEOUT = 15_000

export interface PiniaColadaCacheState {
  queries: UseQueryEntryPayload[]
  mutations: UseMutationEntryPayload[]
}

export interface PiniaColadaChannelProtocol extends InPageChannelProtocol {
  pageScript: DevtoolsProcedures
  panel: Record<string, never>
  sharedStates: {
    cache: PiniaColadaCacheState
  }
}
