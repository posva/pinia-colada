import { defineRpcFunction } from 'devframe'
import type { RpcDefinitionsToFunctionsWithNamespace } from 'devframe/rpc'

/**
 * Message relay between the inspected app page and the devtools panels. Both
 * sides keep speaking the devtools `DuplexChannel` protocol; each direction is
 * one action that broadcasts the `{ id, data }` envelope to the other side:
 *
 * - `app-event`: panel → app (`DevtoolsEmits`, plus `devtools:ready` to
 *   request a full sync)
 * - `panel-event`: app → panels (`AppEmits`)
 */

// pnpm resolves two devframe instances (with/without the srvx peer of
// @vitejs/devtools-kit), so augmenting DevframeRpcClientFunctions merges into
// only one of them depending on program file order — call broadcast through a
// stable structural type instead
type Broadcast = (options: {
  method: string
  args: unknown[]
  optional?: boolean
  event?: boolean
}) => Promise<void>

const appEvent = defineRpcFunction({
  name: 'app-event',
  type: 'action',
  setup: (ctx) => ({
    handler: (event: string, args: unknown[]) =>
      (ctx.rpc.broadcast as Broadcast)({
        method: 'pinia-colada:app-event',
        args: [event, args],
        optional: true,
        event: true,
      }),
  }),
})

const panelEvent = defineRpcFunction({
  name: 'panel-event',
  type: 'event',
  setup: (ctx) => ({
    handler: (event: string, args: unknown[]) =>
      (ctx.rpc.broadcast as Broadcast)({
        method: 'pinia-colada:panel-event',
        args: [event, args],
        optional: true,
        event: true,
      }),
  }),
})

export const serverFunctions = [appEvent, panelEvent] as const

declare module 'devframe' {
  interface DevframeRpcServerFunctions extends RpcDefinitionsToFunctionsWithNamespace<
    'pinia-colada',
    typeof serverFunctions
  > {}
}
