/**
 * The in-page channel contract shared by the app's page script and the
 * devtools panels — see https://devfra.me/guide/in-page-channel.
 *
 * Both sides keep speaking the devtools `DuplexChannel` protocol; the channel
 * only carries the raw `{ id, args }` envelopes between them, one cache event
 * per message. The payloads are already serialization-safe
 * (`DuplexChannel.emit` ran them through `toRawDeep`) and only the receiving
 * `DuplexChannel` restores them, so the relay never decodes anything — hence
 * the loose `unknown[]`; the typed contract lives in `AppEmits` /
 * `DevtoolsEmits` in `@pinia/colada-devtools/shared`.
 *
 * No server is involved: the panel finds the page script through a
 * same-origin `postMessage` handshake, which also means the transport behaves
 * the same in a dev server and in a static build, and needs no devframe auth.
 */
import type { InPageChannelProtocol } from 'devframe/in-page-channel'

/** Channel name, namespaced with the devframe id. */
export const PINIA_COLADA_CHANNEL = 'pinia-colada:devtools'

export interface PiniaColadaChannelProtocol extends InPageChannelProtocol {
  /** Implemented by the page script (the inspected app), called by panels. */
  pageScript: {
    /** One `DevtoolsEmits` envelope: panel → app. */
    'devtools-emit': (id: string, args: unknown[]) => void
  }
  /** Implemented by every panel, called by the page script. */
  panel: {
    /** One `AppEmits` envelope: app → panel. */
    'app-emit': (id: string, args: unknown[]) => void
  }
}
