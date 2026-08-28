# devtools/devframe — implementation notes

Port of the Pinia Colada devtools to [Vite DevTools](https://devtools.vite.dev/)
through [devframe](https://devfra.me/). Written down while it's fresh: the
choices, the friction, and what the devframe skill/docs didn't cover.

## Architecture in one paragraph

The package **reuses** the `devtools/` sources instead of forking them. The
only thing replaced is the transport: the original devtools talk over a
`DuplexChannel` (a typed wrapper around a `MessagePort` pair) between the app
and the panel custom element. Here, both sides still speak `DuplexChannel` —
each side gets a local `MessageChannel`, and devframe's
[in-page channel](https://devfra.me/guide/in-page-channel) carries the raw
`{ id, data }` envelopes between the two pages, one cache event per message:
`app-emit` (`AppEmits`, page script → every panel) and `devtools-emit`
(`DevtoolsEmits`, panel → page script). No server is involved — the panel
finds the page script through a same-origin `postMessage` handshake, so there
is nothing to authenticate and the transport behaves the same in a dev server
and in a static build. Full sync is the page script's own doing: it replays
everything on `panel:connected`, the analogue of the `ready → sendAll`
handshake the in-app devtools do on the element's `ready` event, and it fires
again on every re-handshake (panel or app reload).

```
app page (page script = authority)                    panel iframe
──────────────────────────────────                    ────────────
setupDevtoolsAppBridge                    <pinia-colada-devtools-panel>
  ⇅ DuplexChannel (port pair)               ⇅ DuplexChannel (port pair)
createPageScriptChannel relays:           connectPanelChannel relays:
  AppEmits ──────────▶ 'app-emit' ─────────────────────▶ panel port
  DevtoolsEmits ◀───── 'devtools-emit' ◀───────────────── panel emits
       ▲
       └─ 'panel:connected' → bridge.sendAll()
```

The contract lives in `src/channel.ts` (the channel name plus the protocol
type), imported by both endpoints.

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
  bridge about devframe, both keep their `MessagePort` contract and ~30 lines
  of relay glue on each side translate to in-page channel primitives. The
  panel and bridge code stay byte-identical with the in-app devtools.
- **In-page channel, not the server RPC.** The first working version relayed
  every envelope through two mirrored server actions that re-broadcast to the
  other side, so each cache event made a round trip over the websocket to
  Node and back to a page next to the one that sent it. The in-page channel is
  the direct link for exactly this shape of traffic, and swapping to it
  deleted the whole server surface: no `defineRpcFunction`s, no
  `DevframeRpcServerFunctions` augmentation, no `connectDevframe()` /
  `ensureTrusted()` in the panel, no synthetic `devtools:ready` id (that is
  `panel:connected` now). Reconnects come for free — a dead port re-handshakes
  and the page script replays — which retires the "events missed while the
  socket was down are only recovered by reopening the dock" edge. It also
  narrows the reach: see the rough edges below.
- **Granular events, not shared state.** A first version mirrored the caches
  into devframe shared state (nice replay-on-connect semantics), but the node
  and client hosts construct their stores without `enablePatches`, so each
  cache event shipped the entire cache up to three times and forced the panel
  to rebuild every row. The final version relays the original granular
  `queries:update`/`delete` events — O(one entry) per event — and lets the
  bridge's own `sendAll` cover late joiners. Less code _and_ less traffic.
  (The in-page channel's shared state _does_ send patches, but per-entry
  events are still the better fit and keep both sides on `DuplexChannel`.)
- **`isPip = true` for the panel.** The custom element has two layouts:
  bottom-docked overlay (in-app) and fill-the-window (PiP). An iframe dock is
  semantically the PiP case.
- **Two generic `(id, args)` channel functions** instead of one typed function
  per devtools action. 17 actions exist and they all follow the same shape;
  the typed contract already lives in `AppEmits` / `DevtoolsEmits`, and the
  relay never decodes an envelope — the payloads are already
  structured-clone-safe (`DuplexChannel.emit` ran them through `toRawDeep`)
  and only the receiving `DuplexChannel` restores them. Hence no
  `jsonSerializable: true`: the envelopes legitimately carry values JSON
  cannot round-trip.
- **Bundle the internal bridge.** The client-script build aliases the internal
  shared entry to the package source and bundles it together with the app
  bridge. Vue, Pinia, and Pinia Colada stay external so the inspected app's
  instances are used. This keeps implementation-only entry points private
  while making the published client script self-contained.

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
- **Duplicated devframe type identity** (historical — the in-page channel
  swap removed it). pnpm materializes two `devframe` instances (with/without
  the `srvx` peer that `@vitejs/devtools-kit` brings), so
  `declare module 'devframe'` augmentations merged into only one of them —
  and _which one_ depended on program file order, making `vue-tsc` fail
  nondeterministically. Now that the package augments nothing and imports no
  client RPC types, there is nothing to merge; the `srvx` split is still there
  and still an upstream packaging issue.
- **Version skew is a hard type error at the kit boundary.** `devframe@0.9.6`
  against a `@vitejs/devtools-kit` whose own `devframe` was still pinned to
  `0.9.5` makes `createPluginFromDevframe(createPiniaColadaDevframe())` fail
  with a 30-line structural mismatch bottoming out at
  `'hub:docks:activate' is not assignable to keyof DevframeRpcServerFunctions`
  — i.e. the two copies disagree on the hub protocol, not on anything this
  package wrote. Fixed by bumping the kit so its `devframe: ^0.9.5` re-resolves
  to the same 0.9.6.
- **The impossible snapshot.** Debugging the simulate-loading bug: the payload
  had `asyncStatus: 'idle'` _and_ `devtools.simulate: 'loading'`, which cannot
  coexist as a synchronous snapshot given the handler's write order — the tell
  that a plugin had made the ref write asynchronous.
- **Node vs bundler module loading.** Vite loads `vite.config.ts` imports
  natively with Node, so everything reachable from the plugin entry needs
  explicit `.ts` extensions, JSON import attributes, and must not import the
  `devtools/` sources (extensionless internal imports). That's why
  `src/vite.ts` / `src/index.ts` import with explicit `.ts`, and why
  `src/channel.ts` stays dependency-free (loose `unknown[]` envelopes instead
  of the `AppEmits` / `DevtoolsEmits` types) — it is shared with the page
  script, which is reachable from the plugin entry only as a bare specifier
  string.
- **Auth ergonomics under automation.** The panel no longer needs a devframe
  connection, but the _hub_ still does before it will mount a dock: devframe
  tokens live in `sessionStorage` (per tab) and OTP codes expire in 5 minutes,
  so every fresh browser context needs the magic-link fragment on a _hard_
  navigation (fragment-only URL changes don't reload, the OTP is never read).

## What required extra research (not in the devframe skill)

The skill covered the definition, RPC/shared-state/broadcast APIs, and
`createPluginFromDevframe`. Everything below came from reading `node_modules`
d.ts/dist or trial and error:

- **Dock client scripts**: `clientScript: { importFrom }` on an iframe dock
  entry, the `/@id/{specifier}` resolution template
  (`configs.dock.clientModuleResolution`), and the crucial detail that
  **hub-ui runs an iframe dock's client script lazily on first activation**,
  not at page load (`createDevframeClientHost` loads them eagerly — the
  embedded viewer doesn't). Consequence: the page script starts when the dock
  is first opened, which the channel's retrying handshake plus the
  `panel:connected` replay make invisible.
- **Shared state syncs the full object per mutation** (server RPC flavour) —
  `enablePatches` exists on `SharedStateOptions` but the client and node hosts
  construct their stores without it, so `on('updated')` always ships the whole
  value. Fine for settings-sized state, wrong for a per-entry cache mirror.
  The in-page channel's own shared state does converge by patches, but this
  package relays events either way.
- **`in-page-channel` is 0.9.6+**: `devframe@0.9.5` has no such export, so the
  subpath simply does not resolve on the older version.
- **`clientAssets` resolution**: a relative string resolved against cwd, not
  `importMetaUrl` (DF0008). Absolute path via `fileURLToPath` required.
- **Dock icons**: accept a served URL (or `{ light, dark }`), documented only
  in `DevframeDockEntryIcon`'s jsdoc.
- **Nuxt's Vite base applies to `/@fs/`.** Standalone Vite serves the bundled
  page script at `/@fs//absolute/path`, while Nuxt DevTools 4's Vite server is
  mounted at `/_nuxt/`. The Vite adapter updates the synthesized dock after
  installation using `ctx.viteConfig.base`, yielding
  `/_nuxt/@fs//absolute/path` under Nuxt. Supplying an absolute Vite URL also
  avoids DF8111 on hosts that do not advertise bare-module resolution.
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
- Page script starts on first dock activation (see above); an eager variant
  would need a host that loads client scripts at boot. Harmless now — the
  panel keeps retrying its hello with backoff until the page script shows up.
- **Same-tab only.** The in-page channel reaches the page script through the
  panel's ancestor chain plus its `opener`, so a panel opened as an unrelated
  top-level tab (rather than embedded in the app page, popped out, or
  `window.open`ed from it) can never connect — where the old server relay
  would have worked from anywhere. Fine for the embedded iframe dock, which is
  the only way this package is mounted today; a remote or external viewer
  would have to keep an RPC path alongside.
- An app open in several tabs means several page scripts on one origin. Each
  carries a per-tab instance id and handshakes are targeted, so a dock pairs
  with its own tab; pinning would need `connectPanelChannel({ instanceId })`.
- The panel logs a console warning after 10s with no page script, which is the
  only signal a user gets that the app is not instrumented (the panel itself
  looks identical to one with an empty cache). A real empty state would want
  `channel.events.on('status:updated')` wired into the panel element.
- The client script bundles its own app bridge. An app that mounts the in-app
  `<PiniaColadaDevtools />` _and_ this dock would therefore get two bridge
  copies with two distinct `DEVTOOLS_INFO_KEY` symbols.
- The `srvx` peer split (two devframe type instances) should be reported
  upstream to `@vitejs/devtools-kit` / devframe.
- `@devframes/hub` and `@devframes/json-render` pin `devframe` to an _exact_
  version, so while the workspace runs `devframe@0.9.6` against the hub
  packages still at `0.9.5` (held back by the release-age policy on the
  lockfile), `pnpm peers check` reports an unmet peer. It resolves itself on
  the next install once 0.9.6 ages past the gate.
