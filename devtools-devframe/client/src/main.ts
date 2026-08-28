/**
 * Panel host: mounts the existing devtools panel (the same custom element the
 * in-app devtools use) and bridges its `MessagePort` to the app page over the
 * devframe in-page channel. Raw `{ id, args }` envelopes are relayed
 * unchanged, one cache event per message:
 *
 * - `AppEmits` arrive as `app-emit` events from the app's page script and are
 *   pushed into the panel's port.
 * - `DevtoolsEmits` from the panel are sent to the page script's
 *   `devtools-emit`.
 *
 * The channel handshakes straight with the page script, so this SPA opens no
 * devframe connection at all: nothing to authenticate, and no full sync to ask
 * for — the page script replays everything when the handshake completes.
 */
import { connectPanelChannel, defineChannelFunction } from 'devframe/in-page-channel'
import { DevtoolsPanel } from '@pinia/colada-devtools/panel'
import { attachCssPropertyRules } from '@pinia/colada-devtools/app-bridge'
import { PINIA_COLADA_CHANNEL } from '../../src/channel.ts'
import type { PiniaColadaChannelProtocol } from '../../src/channel.ts'

/** how long to wait for the app's page script before saying it's missing */
const PAGE_SCRIPT_TIMEOUT = 10_000

if (!customElements.get('pinia-colada-devtools-panel')) {
  customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
}

const mc = new MessageChannel()

const channel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  functions: [
    // AppEmits: app → panel
    defineChannelFunction({
      name: 'app-emit',
      type: 'event',
      handler: (id: string, args: unknown[]) => {
        mc.port1.postMessage({ id, data: args })
      },
    }),
  ],
})

export type PanelChannel = typeof channel

// DevtoolsEmits: panel → app page. Buffered by the channel while it is still
// handshaking, so the panel is usable before the page script answers
mc.port1.addEventListener('message', (event) => {
  const { id, data } = event.data as { id: string; data: unknown[] }
  channel.callEvent('devtools-emit', id, data)
})
mc.port1.start()

// the page script only exists in an app running the devtools plugin, and the
// panel is otherwise indistinguishable from one that simply has no entries
channel.whenConnected(PAGE_SCRIPT_TIMEOUT).catch(() => {
  console.warn(
    `[pinia-colada-devtools] no Pinia Colada page script answered on "${PINIA_COLADA_CHANNEL}" ` +
      `after ${PAGE_SCRIPT_TIMEOUT}ms: the inspected app has no active pinia, or it is not ` +
      `running the devtools plugin. Still listening.`,
  )
})

const el = document.createElement('pinia-colada-devtools-panel') as HTMLElement & {
  port: MessagePort
  isPip: boolean
  channel: typeof channel
}
el.port = mc.port2
// PiP layout = fill the window, which is exactly what the iframe dock needs
el.isPip = true
el.channel = channel
el.style.display = 'block'
el.style.height = '100%'
el.addEventListener('ready', () => {
  // @property rules are ignored inside shadow DOM
  attachCssPropertyRules(el)
})
document.getElementById('app')!.appendChild(el)
