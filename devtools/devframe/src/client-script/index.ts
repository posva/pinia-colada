/**
 * Dock client script, a.k.a. the in-page channel's **page script**: runs
 * inside the inspected app page (same Vite module graph as the app, so
 * `pinia` / `@pinia/colada` and the devtools sources resolve to the app's own
 * instances). Reuses the app-side wiring from `@pinia/colada-devtools`
 * (`setupDevtoolsAppBridge`) over a local `MessageChannel` and relays the raw
 * `{ id, args }` envelopes to the panels through the channel.
 *
 * It is the authority of the channel: panels handshake with it directly, so no
 * devframe server round-trip (and no auth) is involved, and a panel that
 * connects — or reconnects after a reload — gets a full replay, the same
 * `ready → sendAll` handshake the in-app devtools do on the element's `ready`
 * event.
 */
import { createPageScriptChannel, defineChannelFunction } from 'devframe/in-page-channel'
import type { QueryCache, MutationCache } from '@pinia/colada'
import { getActivePinia } from 'pinia'
import type { Pinia } from 'pinia'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge } from '../../../src/app-bridge.ts'
import { PINIA_COLADA_CHANNEL } from '../channel.ts'
import type { PiniaColadaChannelProtocol } from '../channel.ts'

const PINIA_WAIT_TIMEOUT = 15_000

interface DockClientScriptContext {
  rpc: {
    scope: (namespace: string) => {
      rpc: {
        callEvent: (method: string, ...args: unknown[]) => void
      }
    }
  }
}

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
    // standalone viewer or an app without pinia: nothing to inspect here, so
    // never answer a handshake — panels stay `connecting` and show their empty
    // state
    return
  }

  const { useQueryCache, useMutationCache } = await import('@pinia/colada')
  const queryCache: QueryCache = useQueryCache(pinia)
  const mutationCache: MutationCache = useMutationCache(pinia)

  const mc = new MessageChannel()
  const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(mc.port1)
  const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, transmitter)
  const agentRpc = ctx.rpc.scope('pinia-colada').rpc

  const channel = createPageScriptChannel<PiniaColadaChannelProtocol>({
    name: PINIA_COLADA_CHANNEL,
    functions: [
      // DevtoolsEmits ← panels
      defineChannelFunction({
        name: 'devtools-emit',
        type: 'event',
        handler: (id: string, args: unknown[]) => {
          mc.port2.postMessage({ id, data: args })
        },
      }),
    ],
  })

  // AppEmits → every connected panel
  mc.port2.addEventListener('message', (event) => {
    const { id, data } = event.data as { id: string; data: unknown[] }
    channel.callEvent('app-emit', id, data)
    agentRpc.callEvent('cache-event', id, data)
  })
  mc.port2.start()

  // Populate the MCP cache even when no visual panel has connected yet.
  bridge.sendAll()

  // a panel that just connected has an empty UI; this also covers reconnects
  // after a panel or app reload, since those are just a new handshake
  channel.events.on('panel:connected', () => {
    bridge.sendAll()
  })
}
