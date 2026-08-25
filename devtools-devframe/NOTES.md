# devtools-devframe — implementation notes

Port of the Pinia Colada devtools to [Vite DevTools](https://devtools.vite.dev/)
through [devframe](https://devfra.me/). Written down while it's fresh: the
choices, the friction, and what the devframe skill/docs didn't cover.

## Architecture in one paragraph

The package **reuses** the `devtools/` sources instead of forking them. The
only thing replaced is the transport: the original devtools talk over a
`DuplexChannel` (a typed wrapper around a `MessagePort` pair) between the app
and the panel custom element. Here, both sides still speak `DuplexChannel` —
each side gets a local `MessageChannel`, and devframe relays the raw
`{ id, data }` envelopes between the two pages, one cache event per message:
two mirrored server actions (`panel-event` for `AppEmits`, `app-event` for
`DevtoolsEmits`) each **broadcast** to the other side. Full sync happens on
demand: the bridge sends everything when it starts, and a panel asks with a
`devtools:ready` event when it connects — the same `ready → sendAll`
handshake the in-app devtools use.

```
app page                          devframe server           panel iframe
────────                          ───────────────           ────────────
setupDevtoolsAppBridge                                      <pinia-colada-devtools-panel>
  ⇅ DuplexChannel (port pair)                                 ⇅ DuplexChannel (port pair)
client script relays:                                       panel host relays:
  AppEmits ─────────────────▶ 'panel-event' ──broadcast──▶  → panel port
  DevtoolsEmits ◀──broadcast── 'app-event' ◀──────────────  ← panel emits (+ 'devtools:ready')
```

## Choices made

- **Reuse over copy.** A first iteration copied `devtools/src/panel` +
  `shared` into this package and rewired the data layer. Rejected: two copies
  of the panel would drift immediately. The final version imports the shipped
  panel custom element (`@pinia/colada-devtools/panel`) untouched and builds it
  with the same toolchain (vue-router file routes, unplugin-icons,
  unplugin-vue-components, tailwind) pointed at `devtools/src`.
- **One small refactor in `devtools/`**: the app-side wiring
  (`$onAction` mirroring + `DevtoolsEmits` handlers) moved verbatim from
  `PiniaColadaDevtools.vue` into an exported `setupDevtoolsAppBridge()` so the
  client script can run it outside a component. Also fixed a real bug there
  (see below).
- **Keep `DuplexChannel` as the seam.** Rather than teaching the panel and the
  bridge about devframe, both keep their `MessagePort` contract and ~40 lines
  of relay glue on each side translate to devframe primitives. The panel and
  bridge code stay byte-identical with the in-app devtools.
- **Granular broadcasts, not shared state.** A first version mirrored the
  caches into devframe shared state (nice replay-on-connect semantics), but
  devframe syncs shared state as the **full object on every mutation** (no
  patches by default), so each cache event shipped the entire cache over the
  socket up to three times and forced the panel to rebuild every row. The
  final version relays the original granular `queries:update`/`delete` events
  as broadcasts — O(one entry) per event — and reuses the devtools' own
  `ready → sendAll` handshake for late joiners. Less code _and_ less traffic.
- **`isPip = true` for the panel.** The custom element has two layouts:
  bottom-docked overlay (in-app) and fill-the-window (PiP). An iframe dock is
  semantically the PiP case.
- **Generic `app-event(name, args)` relay** instead of one typed RPC per
  devtools action. 17 actions exist and they all follow the same shape; the
  typed contract already lives in `DevtoolsEmits`.
- **Workspace-only wiring.** The package resolves `devtools/` sources by
  relative path (vite aliases + tsconfig `paths`). Fine while private; a
  publishable version would need real `exports` on `@pinia/colada-devtools`
  for `app-bridge`/`shared` source (or built) entry points.

## Bug found and fixed (pre-existing upstream)

`queries:simulate:loading` wrote `entry.asyncStatus.value = 'loading'` and
immediately read it back into the payload. The **delay plugin** replaces
`asyncStatus` with a `customRef` that defers the switch to `'loading'` by
200ms, so the payload shipped `'idle'` and nothing re-emits when the deferred
write lands — the UI never showed the simulated loading. Affects the original
in-app devtools too. Fix: the payload creators derive `asyncStatus` from
`devtools.simulate` (`createQueryEntryPayload` /
`createMutationEntryPayload`), which also covers `sendAll` and the
`staleTime` re-emit while a simulation is active. Regression test:
`devtools/src/app-bridge.spec.ts`.

## What was difficult

- **Missing tailwind utilities in the shadow DOM.** The panel rendered with
  data but zero layout. Tailwind v4's automatic source detection only scans
  under the vite root; `devtools/src` lives outside it, so the generated sheet
  had the theme but no utilities. Fix: `client/src/panel-styles.css` wraps the
  real stylesheet with an explicit `@source '../../../devtools/src/panel'`.
  Diagnosed by inspecting `shadowRoot.adoptedStyleSheets` in the browser.
- **Duplicated devframe type identity.** pnpm materializes two `devframe`
  instances (with/without the `srvx` peer that `@vitejs/devtools-kit` brings),
  so `declare module 'devframe'` augmentations merged into only one of them —
  and _which one_ depended on program file order, making `vue-tsc` fail
  nondeterministically. Worked around by not importing the kit's client types
  (a structural `{ rpc: DevframeRpcClient }` subset instead) and calling
  `broadcast` through a structural type. Upstream packaging issue.
- **The impossible snapshot.** Debugging the simulate-loading bug: the payload
  had `asyncStatus: 'idle'` _and_ `devtools.simulate: 'loading'`, which cannot
  coexist as a synchronous snapshot given the handler's write order — the tell
  that a plugin had made the ref write asynchronous.
- **Node vs bundler module loading.** Vite loads `vite.config.ts` imports
  natively with Node, so everything reachable from the plugin entry needs
  explicit `.ts` extensions, JSON import attributes, and must not import the
  `devtools/` sources (extensionless internal imports). That's why
  `src/state.ts` keeps loose types and the payload types stay browser-side.
- **Auth ergonomics under automation.** devframe tokens live in
  `sessionStorage` (per tab) and OTP codes expire in 5 minutes, so every fresh
  browser context needs the magic-link fragment on a _hard_ navigation
  (fragment-only URL changes don't reload, the OTP is never read).

## What required extra research (not in the devframe skill)

The skill covered the definition, RPC/shared-state/broadcast APIs, and
`createPluginFromDevframe`. Everything below came from reading `node_modules`
d.ts/dist or trial and error:

- **Dock client scripts**: `clientScript: { importFrom }` on an iframe dock
  entry, the `/@id/{specifier}` resolution template
  (`configs.dock.clientModuleResolution`), and the crucial detail that
  **hub-ui runs an iframe dock's client script lazily on first activation**,
  not at page load (`createDevframeClientHost` loads them eagerly — the
  embedded viewer doesn't). Consequence: the bridge starts when the dock is
  first opened; the full re-sync on start covers the gap.
- **Shared state syncs the full object per mutation** — `enablePatches`
  exists on `SharedStateOptions` but the client and node hosts construct
  their stores without it, so `on('updated')` always ships the whole value.
  Fine for settings-sized state, wrong for a per-entry cache mirror; that's
  why this package relays events instead.
- **`clientAssets` resolution**: a relative string resolved against cwd, not
  `importMetaUrl` (DF0008). Absolute path via `fileURLToPath` required.
- **Dock icons**: accept a served URL (or `{ light, dark }`), documented only
  in `DevframeDockEntryIcon`'s jsdoc.
- **DF8111 is a false positive** when the Vite host _does_ advertise
  `clientModuleResolution` — the warning fires at registration time, before
  the template is known.
- **The kit plugin owns a `config` hook** — spreading
  `{ ...createPluginFromDevframe(...), config }` clobbers it; return an array
  of plugins instead.
- **Programmatic dock activation** for driving the UI:
  `rpc.call('hub:docks:activate', { dockId })` (this one _is_ in the skill's
  hub protocol table, but its use from the embedded page context wasn't
  obvious).
- **`vue-router/vite` typed-routes volar plugin** needs
  `compilerOptions.rootDir` to match the vite plugin's `root` for
  `_RouteNamesForFilePath` keys to resolve — mismatched roots silently degrade
  `useRoute()` params to a union.

## Known rough edges / next steps

- Panel header still shows the PiP and close buttons (inert in the iframe) —
  hide behind a prop or wire close to the dock host.
- Bridge starts on first dock activation (see above); an eager variant would
  need a host that loads client scripts at boot.
- Events missed while the websocket is down are only recovered by reopening
  the dock or reloading — the panel could re-send `devtools:ready` on the
  client's `connection:status` reconnect event.
- The alias for `@pinia/colada-devtools/app-bridge` is what makes the import
  resolve (the package has no such export); a publishable version needs a
  real subpath export. The alias is also app-global — an app that mounts the
  in-app `<PiniaColadaDevtools />` _and_ this dock would get two bridge
  copies with two distinct `DEVTOOLS_INFO_KEY` symbols.
- The `srvx` peer split (two devframe type instances) should be reported
  upstream to `@vitejs/devtools-kit` / devframe.
