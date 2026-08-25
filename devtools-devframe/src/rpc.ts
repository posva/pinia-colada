import { defineRpcFunction } from 'devframe'
import type { RpcDefinitionsToFunctionsWithNamespace } from 'devframe/rpc'

/**
 * Panel-facing action relay. The caches live in the inspected app page, so
 * every panel event is broadcast to the app's client script, which executes
 * it against the real cache. See `DevtoolsEmits` for the event contract.
 */

// pnpm resolves two devframe instances (with/without the srvx peer of
// @vitejs/devtools-kit), so augmenting DevframeRpcClientFunctions merges into
// only one of them depending on program file order — call broadcast through a
// stable structural type instead
type Broadcast = (options: { method: string; args: unknown[]; optional?: boolean }) => Promise<void>

const appEvent = defineRpcFunction({
  name: 'app-event',
  type: 'action',
  setup: (ctx) => ({
    handler: (event: string, args: unknown[]) =>
      (ctx.rpc.broadcast as Broadcast)({
        method: 'pinia-colada:app-event',
        args: [event, args],
        optional: true,
      }),
  }),
})

export const serverFunctions = [appEvent] as const

declare module 'devframe' {
  interface DevframeRpcServerFunctions extends RpcDefinitionsToFunctionsWithNamespace<
    'pinia-colada',
    typeof serverFunctions
  > {}
}
