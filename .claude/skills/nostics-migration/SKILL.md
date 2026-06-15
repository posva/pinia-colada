---
name: nostics-migration
description: Migrate a library's user-facing errors, warnings, and logs to nostics diagnostics. Use when replacing console.warn/console.error, warn() helpers, or thrown Errors with stable diagnostic codes, or when designing or extending a defineDiagnostics catalog.
---

# Migrate errors and warnings to nostics

Turn ad hoc warnings and errors into a catalog of stable diagnostic codes **without changing runtime behavior**. API details: `references/nostics-api.md`.

## What to migrate

Inventory `console.warn`, `console.error`, `warn(...)` helpers, `throw new Error(...)`, `Promise.reject(new Error(...))`. Skip tests, fixtures, snapshots, generated output, and debug `console.log`s (not user-facing).

Migrate:

- dev warnings that report and keep going
- warnings followed by recovery/fallback (replace the report, keep the recovery)
- plain user-facing thrown or rejected `Error`s (the diagnostic becomes the thrown/rejected value)
- deprecation notices
- build/config errors caused by a user's file: pass **both** the original error as `cause` and the file as `sources`, because the JS stack points inside the library and is useless to the user

Do **not** migrate:

- **structured errors other code inspects** (type fields, private symbols, `isXxxError()` guards, `instanceof` checks): control flow, not reporting. Leave unchanged. If such an error is also user-facing, add a separate dev-only report with the error as `cause`; never replace the error object itself.
- **catch blocks that only log a native/platform error and fall back** when the library can't name a likely cause or concrete fix: the native error is the best info, keep the plain log. This covers platform APIs failing (`history.pushState`, storage quota), **not** errors from the user's own files: a caught parse/config error on a user file becomes a diagnostic carrying the original error as `cause` and the file as `sources`.
- anything where the diagnostic would only restate "an operation failed". A diagnostic earns its place by naming a likely user-code problem or a concrete fix.

## Preserve behavior exactly

A project's dev guard may be `process.env.NODE_ENV !== 'production'` or its own build-time constant (recognize whatever the codebase uses). Written as `DEV` below; treat all forms the same.

- Keep existing dev guards exactly. nostics stripping is additive, not a replacement: a throw/reject that only happened in dev must still only happen in dev.
- Never add a guard the original lacked. A throw/report that fired in production keeps firing in non-stripped production builds. Migrating an unguarded report-only call makes it strippable, so it disappears once `nosticsStrip` runs. That is usually the goal, but if the library deliberately reports in production, surface that instead of changing it silently.
- Keep throw vs reject, timing, recovery code, and returned fallbacks.
- Keep structured error shapes (fields, symbols). Migrating a throw replaces the message with the diagnostic's `why`: if tests assert the old text, update them deliberately; never weaken the message to dodge a test.

## Catalog shape

One catalog file per area (a single `src/diagnostics.ts` is fine for small libraries), exported directly. No factory wrappers, no deep barrel re-exports: the strip plugin tracks the export across one relative import. `nostics` is a runtime import: add it to `dependencies`, not `devDependencies` (library bundlers refuse or inline it otherwise).

```ts
import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /*#__PURE__*/ defineDiagnostics({
  docsBase: (code) => `https://example.com/e/${code.toLowerCase()}`,
  reporters: [/*#__PURE__*/ createConsoleReporter()],
  codes: {
    LIB_R0001: {
      why: (p: { hook: string }) => `${p.hook}() must be called at the top of a setup function.`,
      fix: 'Move the call into setup() or a composable called by setup().',
    },
  },
})
```

- Codes are `PREFIX_XNNNN`. Pick the category letter by **area**, not severity: `B` build, `R` runtime, `C` config, `D` deprecation (reserve `D` for deprecations; a runtime warning is `R`). Published codes are permanent: never rename or reuse one.
- `why` says what happened, with runtime values interpolated through typed param functions (both `why` and `fix` accept them; params merge and are required at the call site). `fix` is the concrete next action, never a restatement of the problem.
- Don't lose extra `console.warn`/`console.error` arguments: an error value becomes `cause`; data values interpolate into `why` (e.g. `JSON.stringify(p.value)`).
- `cause` and `sources` (`'file:line:column'` strings pointing at user code) go **inside the params object** (first argument), merged with message params. The second argument is reporter options only, e.g. `{ method: 'error' }`.
- `docsBase` is optional. If the project has no documented error-page URL scheme, propose one and surface it rather than inventing pages that don't exist.

## Call-site patterns

| Before                                      | After                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DEV && warn(msg)`                          | `DEV && diagnostics.LIB_R0001(params)` (same guard)                                                    |
| warn, then recover/fallback                 | diagnostic, then the same recovery                                                                     |
| warn, then `throw new Error(...)`           | `throw diagnostics.LIB_R0002(params)`                                                                  |
| warn, then `Promise.reject(new Error(...))` | `return Promise.reject(diagnostics.LIB_R0003(params))`                                                 |
| `console.error(...)` level                  | `diagnostics.LIB_B0001(params, { method: 'error' })`                                                   |
| caught error tied to a user file            | `diagnostics.LIB_B0002({ ...params, cause: err, sources: ['src/file.ts:10:5'] }, { method: 'error' })` |
| structured/internal error                   | leave unchanged                                                                                        |

Calling a handle always runs the reporters, so `throw diagnostics.CODE(params)` reports **and** throws. For a warn-then-throw site that's the same double output it already had; for a bare `throw new Error(...)` it adds a console report before the throw, normally fine, but mention it if the library is strict about console output.

Report-only calls must stay bare expression statements (including `DEV && diagnostics.LIB_R0001(p)`) so `nosticsStrip` can remove them. `throw`/`return`/assigned diagnostics are behavior and stay.

Stripping diagnostics from production takes two pieces: `/*#__PURE__*/` annotations on the catalog (`defineDiagnostics(...)` and each reporter factory call) so an unused catalog tree-shakes away, and a `DEV` guard on every report-only call site. Write both manually, or let the `nosticsStrip` build plugin add them (`import { nosticsStrip } from 'nostics/unplugin/strip-transform'`, then the matching adapter: `nosticsStrip.rolldown()`, `.vite()`, `.rollup()`, ...). When every report-only site is already dev-guarded, manual annotations suffice and avoid a build transform; reach for the plugin when call sites are unguarded and stripping is wanted. Either way: if the library deliberately reports unguarded in production, don't silence it; ask the maintainer.

## Documentation pages (optional)

Only when the repo already has a documentation site (`docs/` with VitePress, Docusaurus, or similar): create one page per code and make `docsBase` resolve to them. No docs site → skip pages; just propose a `docsBase` URL scheme and surface it.

- Derive directory and URL shape from the existing site, not preference: pages live where `docsBase` resolves (`docsBase` → `https://example.com/errors/<code>` means `docs/errors/<code>.md`), and the URL must match the site's link style (clean URLs vs `.html`) so every reported `see:` link lands.
- If the site serves raw markdown alongside HTML (an llms integration: `vitepress-plugin-llms`, llms.txt tooling, or similar), end `docsBase` URLs in `.md`: diagnostics links are read by AI agents as much as humans, and the raw page spares them the HTML. Without such an integration, never assume `.md` resolves; match the HTML link style.
- One file per code, lowercase (`docs/errors/lib_r0001.md`), plus an `index.md` listing all codes grouped by area with one-line summaries. Register the section in the site's sidebar/nav.
- Page template: title `CODE: short summary`; level line (warn/error, dev-only or also production); **What happened**; **How to fix it** with a short wrong/right code example; **Common causes**.
- Write for the user who just hit the message: name the user-code mistake and the next action. A page that only restates `why` isn't worth a click: pull in context the one-line message couldn't carry (recovery behavior, related options, links to relevant guides).
- Document only user-facing codes. Internal assertions and companion tooling (devtools panels, debug plugins) don't get public error pages.

## Verify

- Tests for warnings, throws, guards, and error shapes still pass; tests asserting exact message text are updated consciously, not accidentally.
- Dev-only gates are present everywhere the source had them, and no new gates were added.
- Report-only diagnostics remain strippable expression statements. Thrown/returned diagnostics keep their message in production by design: they're behavior, not reports.
- If doc pages were created, the docs site builds and the sidebar/index links resolve.
