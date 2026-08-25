/**
 * Dock client script: runs inside the inspected app page (same Vite module
 * graph as the app, so `pinia` / `@pinia/colada` and the devtools sources
 * resolve to the app's own instances). Reuses the app-side wiring from
 * `@pinia/colada-devtools` (`setupDevtoolsAppBridge`) over a local
 * `MessageChannel` and relays the raw `{ id, data }` envelopes through
 * devframe, one cache event per message. The envelopes are forwarded without
 * decoding: the payloads are already serialization-safe (`DuplexChannel.emit`
 * ran them through `toRawDeep`) and only the panel end restores them.
 */
import type { DevframeRpcClient } from 'devframe/client'
import type { QueryCache, MutationCache } from '@pinia/colada'
import { getActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from '@pinia/colada-devtools/app-bridge'

// structural subset of the kit's DockClientScriptContext — importing the kit's
// client types would pull a second devframe type instance into the program
interface DockClientScriptContext {
  rpc: DevframeRpcClient
}

const PINIA_WAIT_TIMEOUT = 15_000

// the app might create its pinia after this script loads
async function waitForActivePinia(): Promise<Pinia | null> {
  const start = Date.now()
  while (Date.now() - start < PINIA_WAIT_TIMEOUT) {
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

  const mc = new MessageChannel()
  const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(mc.port1)
  const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, transmitter)

  // AppEmits → panels
  mc.port2.addEventListener('message', (event) => {
    const { id, data } = event.data as { id: string; data: unknown[] }
    my.rpc.callEvent('panel-event', id, data)
  })
  mc.port2.start()

  // DevtoolsEmits ← panels, relayed by the server as broadcasts
  my.rpc.register({
    name: 'app-event',
    type: 'action',
    handler: (id: string, data: unknown[]) => {
      // a (re)connecting panel asks for the current entries
      if (id === 'devtools:ready') {
        bridge.sendAll()
        return
      }
      mc.port2.postMessage({ id, data })
    },
  })

  // panels that connected before this page load
  bridge.sendAll()
}
