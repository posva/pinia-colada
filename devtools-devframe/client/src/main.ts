/**
 * Panel host: mounts the existing devtools panel (the same custom element the
 * in-app devtools use) and bridges its MessagePort over devframe. Raw
 * `{ id, data }` envelopes are relayed unchanged, one cache event per message:
 *
 * - `AppEmits` arrive as `panel-event` broadcasts from the app's client
 *   script and are pushed into the panel's port.
 * - `DevtoolsEmits` from the panel are forwarded to the `app-event` action,
 *   which the server broadcasts to the app page. `devtools:ready` asks the
 *   app for a full sync.
 */
import { connectDevframe } from 'devframe/client'
import { DevtoolsPanel } from '@pinia/colada-devtools/panel'
import { attachCssPropertyRules } from '@pinia/colada-devtools/app-bridge'

if (!customElements.get('pinia-colada-devtools-panel')) {
  customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
}

const mc = new MessageChannel()

const el = document.createElement('pinia-colada-devtools-panel') as HTMLElement & {
  port: MessagePort
  isPip: boolean
}
el.port = mc.port2
// PiP layout = fill the window, which is exactly what the iframe dock needs
el.isPip = true
el.style.display = 'block'
el.style.height = '100%'
el.addEventListener('ready', () => {
  // @property rules are ignored inside shadow DOM
  attachCssPropertyRules(el)
})
document.getElementById('app')!.appendChild(el)

const client = await connectDevframe()
await client.ensureTrusted()
const my = client.scope('pinia-colada')

// DevtoolsEmits: panel → app (via the server relay)
mc.port1.addEventListener('message', (event) => {
  const { id, data } = event.data as { id: string; data: unknown[] }
  my.rpc.call('app-event', id, data)
})
mc.port1.start()

// AppEmits: app → panel
my.rpc.register({
  name: 'panel-event',
  type: 'event',
  handler: (id: string, data: unknown[]) => {
    mc.port1.postMessage({ id, data })
  },
})

// ask the app page for the current entries
my.rpc.call('app-event', 'devtools:ready', [])
