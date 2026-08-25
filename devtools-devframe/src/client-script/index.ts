/**
 * Dock client script: runs inside the inspected app page (same Vite module
 * graph as the app, so `pinia` / `@pinia/colada` and the devtools sources
 * resolve to the app's own instances). Reuses the app-side wiring from
 * `@pinia/colada-devtools` (`setupDevtoolsAppBridge`) over a local
 * `MessageChannel` and relays its messages through devframe:
 *
 * - `AppEmits` (cache → devtools) land in devframe shared state.
 * - `DevtoolsEmits` (panel → cache) arrive as `app-event` broadcasts.
 */
import type { DevframeRpcClient } from 'devframe/client'
import type { QueryCache, MutationCache } from '@pinia/colada'
import { getActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import type {
  AppEmits,
  DevtoolsEmits,
  UseQueryEntryPayload,
  UseMutationEntryPayload,
} from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from '@pinia/colada-devtools/app-bridge'
import { QUERIES_STATE_KEY, MUTATIONS_STATE_KEY } from '../state.ts'
import type { EntriesState } from '../state.ts'

// structural subset of the kit's DockClientScriptContext — importing the kit's
// client types would pull a second devframe type instance into the program
interface DockClientScriptContext {
  rpc: DevframeRpcClient
}

// the app might create its pinia after this script loads
async function waitForActivePinia(timeoutMs = 15_000): Promise<Pinia | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pinia = getActivePinia()
    if (pinia) return pinia
    await new Promise((r) => setTimeout(r, 200))
  }
  return null
}

export default async function setupPiniaColadaBridge(ctx: DockClientScriptContext) {
  const pinia = await waitForActivePinia()
  if (!pinia) {
    // standalone viewer or an app without pinia: nothing to inspect here
    return
  }

  const { useQueryCache, useMutationCache } = await import('@pinia/colada')
  const queryCache: QueryCache = useQueryCache(pinia)
  const mutationCache: MutationCache = useMutationCache(pinia)

  const my = ctx.rpc.scope('pinia-colada')
  const queries = await my.rpc.sharedState<EntriesState>(QUERIES_STATE_KEY)
  const mutations = await my.rpc.sharedState<EntriesState>(MUTATIONS_STATE_KEY)

  const mc = new MessageChannel()
  const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(mc.port1)
  const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, transmitter)

  // AppEmits → shared state. The payloads on the wire are already
  // serialization-safe (DuplexChannel.emit ran them through toRawDeep).
  mc.port2.addEventListener('message', (event) => {
    const { id, data } = event.data as { id: keyof AppEmits; data: unknown[] }
    switch (id) {
      case 'queries:all':
        queries.mutate((draft) => {
          draft.entries = {}
          for (const payload of data[0] as UseQueryEntryPayload[]) {
            draft.entries[payload.keyHash] = payload
          }
        })
        break
      case 'queries:update': {
        const payload = data[0] as UseQueryEntryPayload
        queries.mutate((draft) => {
          draft.entries[payload.keyHash] = payload
        })
        break
      }
      case 'queries:delete': {
        const payload = data[0] as UseQueryEntryPayload
        queries.mutate((draft) => {
          delete draft.entries[payload.keyHash]
        })
        break
      }
      case 'mutations:all':
        mutations.mutate((draft) => {
          draft.entries = {}
          for (const payload of data[0] as UseMutationEntryPayload[]) {
            draft.entries[payload.id] = payload
          }
        })
        break
      case 'mutations:update': {
        const payload = data[0] as UseMutationEntryPayload
        mutations.mutate((draft) => {
          draft.entries[payload.id] = payload
        })
        break
      }
      case 'mutations:delete': {
        const payload = data[0] as UseMutationEntryPayload
        mutations.mutate((draft) => {
          delete draft.entries[payload.id]
        })
        break
      }
    }
  })
  mc.port2.start()

  // DevtoolsEmits ← panel, relayed by the server as broadcasts
  my.rpc.register({
    name: 'app-event',
    type: 'action',
    handler: (id: string, data: unknown[]) => {
      mc.port2.postMessage({ id, data })
    },
  })

  bridge.sendAll()
}
