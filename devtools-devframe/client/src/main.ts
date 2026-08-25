/**
 * Panel host: mounts the existing devtools panel (the same custom element the
 * in-app devtools use) and bridges its MessagePort over devframe:
 *
 * - `AppEmits` come from devframe shared state (fed by the app's client
 *   script) and are pushed into the panel's port.
 * - `DevtoolsEmits` from the panel are forwarded to the `app-event` action,
 *   which the server broadcasts to the app page.
 */
import { connectDevframe } from 'devframe/client'
import { DevtoolsPanel } from '@pinia/colada-devtools/panel'
import { attachCssPropertyRules } from '@pinia/colada-devtools/app-bridge'
import { QUERIES_STATE_KEY, MUTATIONS_STATE_KEY } from '../../src/state.ts'
import type { EntriesState } from '../../src/state.ts'

customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)

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

// AppEmits: app → panel (via shared state, replayed on connect)
const [queries, mutations] = await Promise.all([
  my.rpc.sharedState<EntriesState>(QUERIES_STATE_KEY),
  my.rpc.sharedState<EntriesState>(MUTATIONS_STATE_KEY),
])

function pushQueries(state: EntriesState) {
  mc.port1.postMessage({ id: 'queries:all', data: [Object.values(state.entries)] })
}
function pushMutations(state: EntriesState) {
  mc.port1.postMessage({ id: 'mutations:all', data: [Object.values(state.entries)] })
}

pushQueries(queries.value() as EntriesState)
pushMutations(mutations.value() as EntriesState)
queries.on('updated', (full) => pushQueries(full as EntriesState))
mutations.on('updated', (full) => pushMutations(full as EntriesState))
