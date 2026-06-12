# nostics API cheat sheet

Accurate as of nostics 0.4 (https://www.npmjs.com/package/nostics).

## Core

```ts
import { createConsoleReporter, defineDiagnostics, Diagnostic } from 'nostics'
```

`defineDiagnostics({ docsBase?, reporters?, codes })` returns one callable handle per code. Calling a handle creates a fresh `Diagnostic`, runs every reporter in order, and returns the instance. `throw` the return value to raise it — reporters still run first, so a thrown diagnostic also reports.

`Diagnostic extends Error`:

- `name`: the code (e.g. `LIB_R0001`)
- `message` / `why`: resolved explanation
- `fix?`: how to resolve it
- `docs?`: docs URL
- `sources?`: `'file:line:column'` strings from the call site
- `cause?`: original error from the call site
- `toJSON()`: `{ name, why, fix, docs, sources, cause, stack }` (all keys present; `JSON.stringify` drops the `undefined` ones later)

## Definitions

```ts
export const diagnostics = defineDiagnostics({
  docsBase: (code) => `https://example.com/e/${code.toLowerCase()}`,
  reporters: [createConsoleReporter()],
  codes: {
    LIB_B2011: {
      why: (p: { src: string; mode: 'client' | 'server' }) =>
        `Plugin "${p.src}" conflicts with mode "${p.mode}".`,
      fix: (p: { mode: 'client' | 'server' }) =>
        `Rename the file or register it with mode "${p.mode === 'client' ? 'server' : 'client'}".`,
      docs: 'https://example.com/custom', // optional per-code override, or `false` to omit
    },
  },
})
```

- `why` is required (string or typed param function); it becomes `Error.message`.
- `fix` is optional but recommended whenever the solution is known.
- Params from `why` and `fix` are intersected and required (type-checked) at the call site.
- `docsBase` as a string appends `/${code.toLowerCase()}`; as a function it receives the code and returns the full URL (or `undefined` to omit).

## Call sites

```ts
diagnostics.LIB_B2011({ src, mode }) // report only — returns the Diagnostic
throw diagnostics.LIB_B2011({ src, mode }) // raise

// runtime fields merge into the same params object:
diagnostics.LIB_B2011({
  src,
  mode,
  cause: originalError,
  sources: ['nuxt.config.ts:42:3'],
})

// reporter options are the second argument:
diagnostics.LIB_B2011({ src, mode }, { method: 'error' })
```

`sources` matters most for build/config diagnostics where the JS stack points inside the library but the problem lives in a user file.

## Reporters and formatters

| Built-in                          | Import                    | Use                                                                                                                               |
| --------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `createConsoleReporter(options?)` | `nostics`                 | `console[method](formatter(d))`; `method` defaults to `'warn'`, overridable per call via `{ method: 'log' \| 'warn' \| 'error' }` |
| `createFileReporter(options?)`    | `nostics/reporters/node`  | NDJSON appended to `.nostics.log`                                                                                                 |
| `createFetchReporter(url)`        | `nostics/reporters/fetch` | POSTs diagnostic JSON; failures swallowed                                                                                         |
| `createDevReporter()`             | `nostics/reporters/dev`   | browser → Vite dev server via `import.meta.hot`                                                                                   |

Formatters: `formatDiagnostic` (plain text, default), `ansiFormatter(colors)` from `nostics/formatters/ansi`, `jsonFormatter` from `nostics/formatters/json`.

Custom reporter: `(diagnostic: Diagnostic, options?: Opts) => void`. Declaring a required `options` type makes the second call-site argument required and typed.

Output shape of `formatDiagnostic`:

```txt
[LIB_B2011] Plugin `./analytics.server.ts` conflicts with mode `client`.
├▶ fix: Rename the file or register it with the other mode.
├▶ sources: modules/analytics.ts:18:5
╰▶ see: https://example.com/e/lib_b2011
```

## Production stripping

```ts
import { nosticsStrip } from 'nostics/unplugin/strip-transform'
// vite: nosticsStrip.vite()  — also .rollup() .rolldown() .webpack() .esbuild() ...
```

The plugin marks `defineDiagnostics()` as `/*#__PURE__*/` and wraps **bare diagnostic expression statements** with `process.env.NODE_ENV !== "production" &&` so bundlers drop them:

```ts
diagnostics.LIB_R0001() // strippable
condition && diagnostics.LIB_R0002() // strippable
```

These stay, because they are behavior:

```ts
throw diagnostics.LIB_R0003()
return diagnostics.LIB_R0004()
const d = diagnostics.LIB_R0005()
fn(diagnostics.LIB_R0006())
```

For the cross-file tracking to work: relative imports, export the `defineDiagnostics()` result directly, no factory wrappers, no deep barrels.

Stripping is **additive**. It does not replace a library's own dev/prod compile-time guards (`process.env.NODE_ENV` checks or project-defined build-time constants); keep those guards unless the project deliberately changes its build strategy and verifies the bundle.

The plugin is optional: writing `/*#__PURE__*/` manually before `defineDiagnostics(` and each reporter factory call, with every report-only call site dev-guarded in source, achieves the same production output without a build transform.

Dev-time collection for apps: `nosticsCollector.vite()` from `nostics/unplugin/dev-server-collector` + `createDevReporter()` in the catalog reporters.

## Docs registry

Each published code should keep a stable URL forever. Page template: title with code, level, what happened, how to fix it, common causes, example output. A CI check can diff catalog keys against docs pages.
