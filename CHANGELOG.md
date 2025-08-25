## [0.17.2](https://github.com/posva/pinia-colada/compare/v0.17.1...v0.17.2) (2025-08-25)

### Features

- expose internal method to plugins ([740e1ce](https://github.com/posva/pinia-colada/commit/740e1ce70bdc68da529bdabe7f79d98c5ad3bc9e))

### Bug Fixes

- allow initial fetch with refetchOnMount false and placeholderData ([#350](https://github.com/posva/pinia-colada/issues/350)) ([e9b9972](https://github.com/posva/pinia-colada/commit/e9b9972d4f47dbb69533926bb89de0b03c5535f0))
- always propagate errors ([9268b37](https://github.com/posva/pinia-colada/commit/9268b37805a6efb22de1a668c2213465e158421a)), closes [#371](https://github.com/posva/pinia-colada/issues/371)

## [0.17.1](https://github.com/posva/pinia-colada/compare/v0.17.0...v0.17.1) (2025-06-13)

### Bug Fixes

- avoid uncaught error in defineQuery ([3037012](https://github.com/posva/pinia-colada/commit/30370123146bd4ffbb88588080d1795281dd0210)), closes [#312](https://github.com/posva/pinia-colada/issues/312)

## [0.17.0](https://github.com/posva/pinia-colada/compare/v0.16.1...v0.17.0) (2025-06-03)

### ⚠ BREAKING CHANGES

- replace `EntryNodeKey` with `EntryKey`
- **types:** The `EntryKeyTagged` type now has multiple type params and an array is no longer assignable to it. This is necessary to correctly infer the types for `TData` and `TDataInitial` and if you were **manually** using `EntryKeyTagged`, you will either need to cast arrays to it or use `EntryKey` instead. **In most cases this should not affect you**. This makes types stricter and also disallows setting a query data to `undefined`. If you were doing `queryCache.setQueryData(key, undefined)`, use `queryCache.setEntryState` instead.

### Features

- add a queryCache.get method to a typed entry ([2f7db57](https://github.com/posva/pinia-colada/commit/2f7db57de186c0571435e766aedc27321a255970))
- add error to tagged keys ([7ad07c4](https://github.com/posva/pinia-colada/commit/7ad07c4a7a1361a288f3424919499b89d10331dc))
- useQueryState ([e1e84eb](https://github.com/posva/pinia-colada/commit/e1e84ebcca331bb5917aa2dfdd7e91d0f9b5cf68)), closes [#23](https://github.com/posva/pinia-colada/issues/23)

### Bug Fixes

- **types:** avoid incorrect undefined from tagged keys ([9358619](https://github.com/posva/pinia-colada/commit/9358619d9b42a961877bc7c23ecde09c80420d15))
- **types:** make options parameter optional in types ([#224](https://github.com/posva/pinia-colada/issues/224)) ([20bca79](https://github.com/posva/pinia-colada/commit/20bca79ed7e45bcfa31c15bd473b19ee4de88f76))

### Code Refactoring

- remove deprecated `EntryNodeKey` ([6c7d15b](https://github.com/posva/pinia-colada/commit/6c7d15b265640592dac09ddc537a1097454c013a))

## [0.16.1](https://github.com/posva/pinia-colada/compare/v0.16.0...v0.16.1) (2025-05-22)

### Bug Fixes

- **ssr:** make `when` relative to work across timezones ([43b4f7d](https://github.com/posva/pinia-colada/commit/43b4f7da76672613b51483249e7a4657a5ef92b5)), closes [#293](https://github.com/posva/pinia-colada/issues/293)

## [0.16.0](https://github.com/posva/pinia-colada/compare/v0.15.3...v0.16.0) (2025-05-21)

This is the biggest release to date! Many bug fixes, typed keys, a lighter and faster build!

### ⚠ BREAKING CHANGES

- **query:** `queryCache.invalidateQueries()` now accepts a second parameter to control whether to refetch or not active queries. It can be set to `'all'` to force fetch all queries. This replaces the existing behavior of passing `active: null` (**can be removed now**) which wasn't actually working. **You shouldn't be negatively affected by this change as it wasn't working previously**.
- The internal cache structure has been refactored to be simpler, faster and smaller. Keys now support deeply nested objects and partially matches them when filtering (e.g. `queryCache.getEntries()`). To achieve this, the hydrated version of the cache has changed. `serializeTreeMap` has been removed but `serializeQueryCache` (which should be preferred) has been kept. `EntryNodeKey` and `TreeMapNode` (internals) have been removed. `EntryNodeKey` was just `string | number`. `toCacheKey` has been adapted and now returns a plain string rather than an array. This also fixed `queryCache.getEntries(['1'])` actually returning entries defined with a numeric key (`[1]`). The type for `key` is now stricter to ensure everything works well at the type level, you might notice it doesn't allow `undefined` as a value (except in objects), **this is intended** as the serialized version (JSON) transforms it no `null`, and will not match in the cache if used, if you want an nullish value, use `null`. The [documentation has been updated to reflect this](https://pinia-colada.esm.dev/guide/query-keys.html#Keys-are-hierarchical)
- **types:** If you built a plugin, you will have to rename the type params of generics like `UseQueryEntryExtensions` from `TResult` to `TData`. Otherwise, this change won't affect you.

### Features

- allow deeply nested structured keys ([59227a8](https://github.com/posva/pinia-colada/commit/59227a8e28dfffa2991d2aa28ce57357ee5d074b)), closes [#149](https://github.com/posva/pinia-colada/issues/149)
- **query:** allow dynamic typed keys ([0053deb](https://github.com/posva/pinia-colada/commit/0053debd6a0d364c954777363d7bd91b2106b4b2))
- **query:** allow for typed query keys ([5068a52](https://github.com/posva/pinia-colada/commit/5068a52f254ca82baa3f0395d9865ba39385d3b8))
- queryCache.setQueriesData ([4818d3e](https://github.com/posva/pinia-colada/commit/4818d3ecc00a3a1900d2b4cf74d29969e6787bc3))
- **types:** explicit types for useInfiniteQuery ([5eb9e3b](https://github.com/posva/pinia-colada/commit/5eb9e3bad47cc117669f9d153eebfe0f8bd96c33))
- **types:** stricter keys ([02f0269](https://github.com/posva/pinia-colada/commit/02f026963e5cd6a2e6e695d2096a2557e71e6974))

### Bug Fixes

- avoid fetch with initialData ([d1eb4c2](https://github.com/posva/pinia-colada/commit/d1eb4c289cfea40090d84e6074a97a8b54403f08))
- **query:** gc entries created through dynamic useQuery in defineQuery ([90d5d83](https://github.com/posva/pinia-colada/commit/90d5d8315d3255f852abb8f9c9c51954bbbdc292))
- **query:** invalidate inactive queries too ([cf5a790](https://github.com/posva/pinia-colada/commit/cf5a790c0bfb525442d32b57d3b2dce92ae5f3b7)), closes [#287](https://github.com/posva/pinia-colada/issues/287)
- **query:** restore reactivity after unmounting defineQuery ([dc2315a](https://github.com/posva/pinia-colada/commit/dc2315a900d51efcec55dfab5fa7cf96889b555c)), closes [#290](https://github.com/posva/pinia-colada/issues/290)
- **types:** make key types stricter ([9669605](https://github.com/posva/pinia-colada/commit/9669605010804ca36e7ff70b03cd28023b834d8a))

### Reverts

- Revert "refactor: use external interface for QueryCache" ([d6befc4](https://github.com/posva/pinia-colada/commit/d6befc4d30ea87a6954cbc42c1ef24819b66307e))

### Code Refactoring

- **types:** rename `TResult` into TData ([09338a2](https://github.com/posva/pinia-colada/commit/09338a26a3b2b09463e457a1711900abe6bcdeff))

## [0.15.3](https://github.com/posva/pinia-colada/compare/v0.15.2...v0.15.3) (2025-05-06)

### Bug Fixes

- correctly handle refetchOn\* when false ([262c090](https://github.com/posva/pinia-colada/commit/262c0909931e7c37768abd0bc792180de2264e51))

## [0.15.2](https://github.com/posva/pinia-colada/compare/v0.15.1...v0.15.2) (2025-05-03)

### Bug Fixes

- check false refetchOnWindowFocus ([c6400d7](https://github.com/posva/pinia-colada/commit/c6400d72a319221969a39b172e36e0bfbe56fe6f)), closes [#272](https://github.com/posva/pinia-colada/issues/272)

## [0.15.1](https://github.com/posva/pinia-colada/compare/v0.15.0...v0.15.1) (2025-04-26)

### Bug Fixes

- support node 18 ([3466bdf](https://github.com/posva/pinia-colada/commit/3466bdf8aec00466340cd99a06bd400e3904797f))

## [0.15.0](https://github.com/posva/pinia-colada/compare/v0.14.2...v0.15.0) (2025-04-18)

### ⚠ BREAKING CHANGES

- **mutations:** mutations are now created each time they are invoked. This
  change will only affect users directly creating entries with the mutation store
  (which should be avoided except in very advanced cases). Given the new
  structure of mutation entries and the fact that they are recreated for each
  mutation in order to keep a history of mutations, the new process simplifies
  things and reduces bundle size. The actions `create` and `ensure` in the
  mutation store are now simpler and take less arguments (many were redundant).
  Alongside these changes, the mutation store has fixed many subtle bugs.

### Features

- add gcTime option for global mutations ([2850167](https://github.com/posva/pinia-colada/commit/2850167182c8f35bd2caaa22c0d0df9b40c5496f))
- add mutation id ([8c8edd5](https://github.com/posva/pinia-colada/commit/8c8edd535f7171a6b5dd7f77aeaaf73b6c967ba6))
- **hmr:** refetch on component change ([56aad7a](https://github.com/posva/pinia-colada/commit/56aad7aa268d90d17824837342e6260968216d8c))
- **mutations:** simplify the entry creation in the mutation store ([a96a8ff](https://github.com/posva/pinia-colada/commit/a96a8ff1ff75939ee21947cd629ddfaf6b284d74))
- untrack mutation entries ([6b65f19](https://github.com/posva/pinia-colada/commit/6b65f19485bda159afb5ba8a1a1bdc7c71d4567e))

### Bug Fixes

- an entry with no options is stale ([3f59d6c](https://github.com/posva/pinia-colada/commit/3f59d6ce524ebadea483f379e968957708716e65))
- **defineQuery:** avoid pausing still active ([fe00447](https://github.com/posva/pinia-colada/commit/fe00447eea2520d995275724f8aa9be0a8bd3b1f)), closes [#246](https://github.com/posva/pinia-colada/issues/246)
- **mutations:** create entries for each individual mutation ([3def820](https://github.com/posva/pinia-colada/commit/3def8204007030235b1703aa45ddb6528da117c1))
- **query:** avoid deleting children of gced queries ([5ec6dcc](https://github.com/posva/pinia-colada/commit/5ec6dcc25661aab6d70c41f5fb6c2026d5653d49))
- setQueryData sets the status and trigger gc if possible ([8137fbd](https://github.com/posva/pinia-colada/commit/8137fbd3fd27f5171466e6948371d0315c0494d6))
- **types:** allow tuples in keys ([f8e8087](https://github.com/posva/pinia-colada/commit/f8e808780c58b899b8e4d7dce188f309b7b95627))
- **types:** infer initial data in setEntryState ([0a94887](https://github.com/posva/pinia-colada/commit/0a94887727184d4021d5992c668fdb53f1bac595))

### Reverts

- Revert "refactor: deprecate onMutate in favor of onBeforeMutate" ([02add4a](https://github.com/posva/pinia-colada/commit/02add4a70c934f46bcf6218a488fec56a5788723)). **This change never actually made it, it's here for the trace.**

## [0.14.2](https://github.com/posva/pinia-colada/compare/v0.14.1...v0.14.2) (2025-03-26)

### Features

- allow global mutation hooks ([045b057](https://github.com/posva/pinia-colada/commit/045b057cb9431956e31ff01d9f694125ca06a8b4))
- avoid incompatible line with Vue 2 ([0c614db](https://github.com/posva/pinia-colada/commit/0c614dba82d33b9bf6bc7a35a5cbc1ee6dad5959))

### Bug Fixes

- **defineQuery:** pause the query when inactive ([2b5057e](https://github.com/posva/pinia-colada/commit/2b5057e1ea6764391b4e1a7494641d459d0bf4b1)), closes [#227](https://github.com/posva/pinia-colada/issues/227)

## [0.14.1](https://github.com/posva/pinia-colada/compare/v0.14.0...v0.14.1) (2025-03-18)

### Bug Fixes

- **types:** allow extending global query options ([28acdd0](https://github.com/posva/pinia-colada/commit/28acdd0d052920100a4a6bbfd9da3cd82dfc166b))

## [0.14.0](https://github.com/posva/pinia-colada/compare/v0.13.8...v0.14.0) (2025-03-18)

This version introduces codemods to automate migrations 🎉. Try them out with:

```sh
pnpm --package=@ast-grep/cli dlx ast-grep scan -r node_modules/@pinia/colada/codemods/rules/migration-0-13-to-0-14.yaml -i src
```

You can also [globally install ast-grep](https://ast-grep.github.io/guide/quick-start.html#installation) and run:

```sh
ast-grep scan -r node_modules/@pinia/colada/codemods/rules/migration-0-13-to-0-14.yaml -i src
```

Remember to commit changes before running the codemods.

### ⚠ BREAKING CHANGES

- Every global query (`useQuery()` and `defineQuery()`)
  option passed to `PiniaColada` has been moved to its own option
  `queryOptions`:

  ```diff
  app.use(PiniaColada, {
    plugins: [],
  -  gcTime: 20_000,
  +  queryOptions: {
  +    gcTime: 20_000,
  +  },
  })
  ```

  You can also use the new codemods to automatically migrate this.

- **types:** This changes allows for Pinia Colada global options to
  auto complete but it also requires you to use pass an options object to
  `app.use(PiniaColada, {})`. This is just for typing reasons (it could be
  a limitation of Vue) but the same old code actually works.

  ```diff
  -app.use(PiniaColada)
  +app.use(PiniaColada, {})
  ```

- Replace `serialize` with `serializeTreeMap`

- Removed `reviveTreeMap` (not needed)
- Removed internal `createdQueryEntry`

### Features

- add codemods for migrations ([1a2d552](https://github.com/posva/pinia-colada/commit/1a2d552df57142967955c51d82846e2a1f9bdb60))
- allow global placeholderData ([a98528a](https://github.com/posva/pinia-colada/commit/a98528ad3e26c84dbc30a911a7a2da74b92111fb)), closes [#216](https://github.com/posva/pinia-colada/issues/216)
- allow invalidating all queries no matter their active status ([a64f674](https://github.com/posva/pinia-colada/commit/a64f674ec43184f467756fdccce4b2e5ae68e48f))
- allow nullish filters ([aadd11d](https://github.com/posva/pinia-colada/commit/aadd11dd6a3d155b6859a22c3ce515d98969584f))

### Bug Fixes

- avoid cancels to change the status ([138857c](https://github.com/posva/pinia-colada/commit/138857c4150d4586818f3f6706a4cfcff3a6622a)), closes [#210](https://github.com/posva/pinia-colada/issues/210)
- avoid unnecessary triggerCache ([a3494a0](https://github.com/posva/pinia-colada/commit/a3494a0f7acfff6654816feb5c01b8673dbcae7a))
- initialize the infinite query pages ([9efb7d4](https://github.com/posva/pinia-colada/commit/9efb7d44feab687285a4cfe6de654502e468a970))
- **types:** correctly type PiniaColada Vue plugin ([f01326f](https://github.com/posva/pinia-colada/commit/f01326f728844037b76fba4ba3eabafc45df8639))
- **types:** placeholderData does not guarantee data ([aed71c1](https://github.com/posva/pinia-colada/commit/aed71c1c6a6f32e940fb16937d9526ee06c24f33)), closes [#217](https://github.com/posva/pinia-colada/issues/217)

### Performance Improvements

- inline filter fn ([2aa1254](https://github.com/posva/pinia-colada/commit/2aa125470fdae96cf474d35bd1f79653a51b4788))

### Code Refactoring

- move global query options to its own option ([f5e20f0](https://github.com/posva/pinia-colada/commit/f5e20f0131c1e0537b9598bc607e33da3fa50919))
- remove deprecated functions ([8ba4362](https://github.com/posva/pinia-colada/commit/8ba436262f4364a4ca46506c2274d15753d20655))

## [0.13.8](https://github.com/posva/pinia-colada/compare/v0.13.7...v0.13.8) (2025-03-09)

### Features

- add more actions to the mutation cache ([a38595c](https://github.com/posva/pinia-colada/commit/a38595c5bfd8c993e763b7a60764ba24c6167546))
- pass previous placeholderData if present ([a576093](https://github.com/posva/pinia-colada/commit/a576093623c515462955dd55c6ff60507b313fd7)), closes [#197](https://github.com/posva/pinia-colada/issues/197)

## [0.13.7](https://github.com/posva/pinia-colada/compare/v0.13.6...v0.13.7) (2025-03-04)

### Bug Fixes

- queryCache should not invalidate query when it disabled ([#204](https://github.com/posva/pinia-colada/issues/204)) ([e12f98c](https://github.com/posva/pinia-colada/commit/e12f98c4cf1a3f9bb1e9f156159ad4e0eed1e45b))
- **warn:** avoid repeated queries warn ([0fbe29a](https://github.com/posva/pinia-colada/commit/0fbe29af54bd09ed754eff5728831ea027ce4c5c)), closes [#192](https://github.com/posva/pinia-colada/issues/192)

## [0.13.6](https://github.com/posva/pinia-colada/compare/v0.13.5...v0.13.6) (2025-02-12)

### Features

- add devtools ([43912aa](https://github.com/posva/pinia-colada/commit/43912aa939e0fa343aa4e26b58f7807cc5ec6ab5))

### Bug Fixes

- apply multiple filters to getEntries ([da5b00c](https://github.com/posva/pinia-colada/commit/da5b00ce7e41746fe27bdc940770ca26a057e7c2))

## [0.13.5](https://github.com/posva/pinia-colada/compare/v0.13.4...v0.13.5) (2025-02-06)

### Features

- add experimental useInfiniteQuery ([0a958e6](https://github.com/posva/pinia-colada/commit/0a958e661c54eac7db25904a7a4ec1090332e1e3))

### Bug Fixes

- avoid clearing timeouts early ([bf7ef2f](https://github.com/posva/pinia-colada/commit/bf7ef2fe2b9ef341d754b151121df16146b8dace))
- correctly track new define queries when switching pages ([f9eeec1](https://github.com/posva/pinia-colada/commit/f9eeec1ef6f9ae49a6b867f5cd09a286a9119404))
- make the cache watchable ([cf30e68](https://github.com/posva/pinia-colada/commit/cf30e6834eb55d0fafe9498d2bf7f88f84902f9a))
- trigger updates on untrack ([91e497a](https://github.com/posva/pinia-colada/commit/91e497a259e48bb7e2842d3d8e5686f03e82408d))

## [0.13.4](https://github.com/posva/pinia-colada/compare/v0.13.3...v0.13.4) (2025-01-31)

### Features

- **plugins:** toCacheKey ([542e15e](https://github.com/posva/pinia-colada/commit/542e15e607ddc1f9878694452d1283e18759c696))
- **types:** expose QueryCache ([fb4c647](https://github.com/posva/pinia-colada/commit/fb4c647846eef6c9f8b2c70febf4e4df9edebc36))

## [0.13.3](https://github.com/posva/pinia-colada/compare/v0.13.2...v0.13.3) (2025-01-14)

### Bug Fixes

- **query:** always use `placeholderData` ([4c6a3f7](https://github.com/posva/pinia-colada/commit/4c6a3f78f33d7984c8cadbb7c259324364e5956e)), closes [#154](https://github.com/posva/pinia-colada/issues/154)
- **query:** avoid creating entries after unmounting ([e2ff278](https://github.com/posva/pinia-colada/commit/e2ff27894c3c578b0676281cd224a75e20638304)), closes [#155](https://github.com/posva/pinia-colada/issues/155)

## [0.13.2](https://github.com/posva/pinia-colada/compare/v0.13.1...v0.13.2) (2025-01-03)

### Bug Fixes

- **defineQuery:** inject globals ([2307daf](https://github.com/posva/pinia-colada/commit/2307daf3998763e1253b97460b7f1dd3ed87270c)), closes [#145](https://github.com/posva/pinia-colada/issues/145)

## [0.13.1](https://github.com/posva/pinia-colada/compare/v0.13.0...v0.13.1) (2024-12-20)

### Bug Fixes

- do not run disabled defined queries on mount ([a85ac9f](https://github.com/posva/pinia-colada/commit/a85ac9fc756cd678ddff45308a06d14ae55b700d)), closes [#138](https://github.com/posva/pinia-colada/issues/138)

## 0.13.0 (2024-11-26)

### ⚠ BREAKING CHANGES

- **types:** placeholderData no longer allows returning `null`, only `undefined`. This won't affect most use cases and enables better type inference.

### Features

- **types:** remove undefined with initialData and placeholderData ([#114](https://github.com/posva/pinia-colada/issues/114)) ([6e1863e](https://github.com/posva/pinia-colada/commit/6e1863e36ade989c439ed77deded47bc18eea2b3))

## 0.12.1 (2024-11-09)

### Bug Fixes

- staleTime of Infinity should still be stale ([#99](https://github.com/posva/pinia-colada/issues/99)) ([6873a6f](https://github.com/posva/pinia-colada/commit/6873a6f2043d5ffc678f41d4c71bdd2f1b329bf9))

## 0.12.0 (2024-11-06)

### ⚠ BREAKING CHANGES

- `transformError` was never fully implemented so they are being removed and might come back if they is a real-word use case for them
- If you were using the `delayLoadingRef` util, [use the `@pinia/colada-plugin-delay` instead](https://github.com/posva/pinia-colada/tree/main/plugins/delay).
- Renaming `Error` to `defaultError` allows to differentiate the property from the existing global Error class. Upgrading should be straightforward.

### Features

- add initial delay plugin ([42c8760](https://github.com/posva/pinia-colada/commit/42c876047927b777b9e047b2aa8beae90407fbc2))
- add track and untrack actions for plugins ([8902ba3](https://github.com/posva/pinia-colada/commit/8902ba3286f4a3a366c25fe0c7d1a27bbabdb3ed))
- allow dynamic values for auto refetches ([63d2fd0](https://github.com/posva/pinia-colada/commit/63d2fd0284ed84c035a8eecbdbd2858ba918324f))
- allow extending useQuery return ([ef06628](https://github.com/posva/pinia-colada/commit/ef066280baedfd155eb7f040d72a8f6ef0c8e771))
- expose more types ([4447d6d](https://github.com/posva/pinia-colada/commit/4447d6d2af7f18f3b42073a96e9297f6b89ce6d1))
- **plugins:** pass scope for added variables ([a3b666f](https://github.com/posva/pinia-colada/commit/a3b666fd8a16fd2ec81017cf928025889e8b5181))
- work without the plugin ([696f88e](https://github.com/posva/pinia-colada/commit/696f88e353329b93155d648dfbe23367099a0d86))

### Bug Fixes

- avoid broken reactivity in defineQuery ([4c48abc](https://github.com/posva/pinia-colada/commit/4c48abcc1d3821ef98c1b57931c8d10d1667c620))
- dedupe pinia colada ([6ace8e8](https://github.com/posva/pinia-colada/commit/6ace8e82dfbf0283a73121975669617f9d0fbe8c))
- keep data if signal is aborted ([de5cde5](https://github.com/posva/pinia-colada/commit/de5cde5f2aded0c8a8eb11dce1ca0d1c3488ec2d))
- pass onMutate context ([618312b](https://github.com/posva/pinia-colada/commit/618312b785ac56bad4518df44005cc5d4647e6a4)), closes [#95](https://github.com/posva/pinia-colada/issues/95)
- remove queryCache from mutation hooks ([3f1119a](https://github.com/posva/pinia-colada/commit/3f1119acea9a79af332f95e870b85ad001e829cf))
- run create in ssr too ([1a6fa4a](https://github.com/posva/pinia-colada/commit/1a6fa4abcc895061c6c1db9d5985eede007b8150))
- **ssr:** throw on error in query ([58b7f69](https://github.com/posva/pinia-colada/commit/58b7f691c7270c83629aad9c4aebe28adc9beae5))
- upgrade to new cache format ([03e1683](https://github.com/posva/pinia-colada/commit/03e1683f895168175dc93a6bc464b94daf35e69f))

### Code Refactoring

- **query:** remove unused transformError and setup options ([de0cb48](https://github.com/posva/pinia-colada/commit/de0cb48dd8a8f29406084fe523eb697ef1817523))
- remove delayLoadingRef helper in favor of the plugins ([4c9b4cb](https://github.com/posva/pinia-colada/commit/4c9b4cbcd6387307ff4a7da826e5d8c948ee49cf))
- rename the global `Error` property in `TypesConfig` to ([0021426](https://github.com/posva/pinia-colada/commit/002142694dece049b4c8521cbe8a9d082c50cdfb))

## 0.11.1 (2024-10-28)

### Features

- allow refetches to throw on erorr ([f168b6c](https://github.com/posva/pinia-colada/commit/f168b6c7e39a8f6c93231dc77bc8e7a562ba807b))
- allow setting data for unexisting queries ([5c3870c](https://github.com/posva/pinia-colada/commit/5c3870cbbffcae1f20b196c6659b3205ded594b7))

### Bug Fixes

- allow gcTime to never be set ([4714b9a](https://github.com/posva/pinia-colada/commit/4714b9a349a0b62697afaecf07c93f525c0ae4ee))
- eagerly change asyncStatus on cancel ([b2f1349](https://github.com/posva/pinia-colada/commit/b2f134904a2e4f9d31df9661b8f0fb8dd56b8ce9))
- staleTime of 0 always refreshes ([66ef9ec](https://github.com/posva/pinia-colada/commit/66ef9ec0c5c10801143677506aa72f8fd4736d0f))

## 0.11.0 (2024-10-25)

### ⚠ BREAKING CHANGES

- **mutations:** This wasn't needed as instead, one can use
  `useQueryCache()` outside. It could be added back if needed but it's
  more pragmatic to start without it.
- **query:** The `queryCache.cancelQuery()` is renamed to
  `queryCache.cancel()` to better match the other functions naming. A new
  function `queryCache.cancelQueries()` is added to actually cancel one or
  multiple queries instead of just one.
- **plugins:** In plugins, `cache` is renamed to `queryCache` for
  consistency.
- This makes it clearer that `queryCache` is the result
  of `useQueryCache()`.

### Features

- add mutation store ([#47](https://github.com/posva/pinia-colada/issues/47)) ([7954f83](https://github.com/posva/pinia-colada/commit/7954f836943e0f6dd849362d8b9b533f75d2554f))
- **hmr:** warn against bugs ([7bb44a0](https://github.com/posva/pinia-colada/commit/7bb44a046d523872968485bffe389348fc7123d4))
- **nuxt:** add auto imports ([964bce2](https://github.com/posva/pinia-colada/commit/964bce27f7688a48961cca240ec1aa3e982c7bc0))
- **nuxt:** support colada.options ([57a0430](https://github.com/posva/pinia-colada/commit/57a0430f1b306feb5b563c6215f48096c96d3ccc))
- predicate in filter ([2fc62b7](https://github.com/posva/pinia-colada/commit/2fc62b76e9c2ffcac1f7331f0ab7a1098d6e2fd8))
- **query:** add cancelQueries ([a374ee2](https://github.com/posva/pinia-colada/commit/a374ee2eda1e5e76f542e958343b5f1a8d5ae42f))
- run defined mutations in effect scope ([86ff5ed](https://github.com/posva/pinia-colada/commit/86ff5ed780d50d9df0105c5f60ef51b40c22a7b1))

### Bug Fixes

- **nuxt:** plugins ([fd95add](https://github.com/posva/pinia-colada/commit/fd95add709a17b47c906692fad7bfc41d9e02d5b))

### Performance Improvements

- tree shake unused stores ([e0ede7e](https://github.com/posva/pinia-colada/commit/e0ede7eb14d1c8fda6c6142d23302585570b6f69))

### Code Refactoring

- **mutations:** Remove `queryCache` from the context ([d9c2509](https://github.com/posva/pinia-colada/commit/d9c2509d4a80d409be86beea49965cfbab2fe71e))
- **plugins:** rename `cache` to `queryCache` ([c97639b](https://github.com/posva/pinia-colada/commit/c97639bfe75e020eeae680aaed8374c5cc1432d6))
- rename `caches` to `queryCache` ([e514d33](https://github.com/posva/pinia-colada/commit/e514d33dcd17650ebd04d3c5f55c40d212b9e52d))

## 0.10.0 (2024-10-04)

### ⚠ BREAKING CHANGES

- This change is mainly to simplify migration from
  TanStack Query.
- caches.invalidateQueries only fetches active queries
- The `keys` option that automatically invalidate keys
  has been renamed to `invalidateKeys` and moved to a plugin. This is in
  practice not needed. It's just an opinionated convenience that can be
  replaced by directly invalidating queries in the cache with the
  `onSettled()` hook in `useMutation()`:

```ts
const { mutate } = useMutation({
  onSettled({ caches, vars: { id } }) {
    caches.invalidateQueries({ key: ['contacts-search'] })
    caches.invalidateQueries({ key: ['contacts', id] })
  },
  mutation: (contact) => patchContact(contact),
})
```

### Features

- caches.invalidateQueries only fetches active queries ([e8d9088](https://github.com/posva/pinia-colada/commit/e8d9088b78df97665f5b9cb15e429183505d171d))

### Code Refactoring

- rename `keys` to `invalidateKeys` and move to plugin ([f709928](https://github.com/posva/pinia-colada/commit/f70992807b5857e17b56c3ca2b90df3fb665eb04))
- useMutation hooks now use positional arguments ([dce00b4](https://github.com/posva/pinia-colada/commit/dce00b4629c19774367bedfa40b53ad2e9f517ea))

## 0.9.1 (2024-09-27)

### Features

- allow nullish return in placeholderData ([1fae179](https://github.com/posva/pinia-colada/commit/1fae179682e0d4880a8e814e0399692d76d9019a))
- wip nuxt module ([66eca6e](https://github.com/posva/pinia-colada/commit/66eca6ea310ca5bf61b790de709068453909d08a))
- wip placeholderData ([307e366](https://github.com/posva/pinia-colada/commit/307e366d4be3b643c433410c81f98ae10e177547))

### Bug Fixes

- **query:** handle sync errors ([cfcdcb1](https://github.com/posva/pinia-colada/commit/cfcdcb192800fb511dd2aa1acca5dc67d8874ff4)), closes [#70](https://github.com/posva/pinia-colada/issues/70) [#69](https://github.com/posva/pinia-colada/issues/69)

## 0.9.0 (2024-08-26)

### ⚠ BREAKING CHANGES

- **query-cache:** To better match the arguments, the `setQueryState`
  action has been renamed to `setEntryState`.

### Features

- **mutations:** add variables ([2e03a93](https://github.com/posva/pinia-colada/commit/2e03a93ad055385b08cf78f3d1f58fd9055be103))
- **query-cache:** Rename `setQueryState` to `setEntryState` ([f481eb0](https://github.com/posva/pinia-colada/commit/f481eb00ed4641e7698313fd3e8d8e05c7f384fa))
- **warn:** warn about reused keys ([7375a19](https://github.com/posva/pinia-colada/commit/7375a193bb850c877644b175135bc4c4f9bb3072))

## 0.8.2 (2024-08-21)

### Performance Improvements

- skip reactivity traversal in store ([3984a3a](https://github.com/posva/pinia-colada/commit/3984a3a77f68fcea30964d23158bd6847b3e7431))

## 0.8.1 (2024-08-17)

### Features

- **ssr:** expose reviveTreeMap ([32b4f17](https://github.com/posva/pinia-colada/commit/32b4f17786dae1ed1c2dbaeeed34e5db0dfe2683))

### Bug Fixes

- **ssr:** mark raw tree node in reviver ([4ff13ad](https://github.com/posva/pinia-colada/commit/4ff13addcd0168c7b2f5e4196aff795e0c690b39))

## 0.8.0 (2024-08-12)

### ⚠ BREAKING CHANGES

- `isFetching` from `useQuery()` is renamed to
  `isLoading` to better reflect that it's connected to `asyncStatus`.
- The setup option in useQuery now receives the options
  as the second argument instead of a context object with the query return
  value and the options. This allows the setup function to have a more
  predictable signature and makes it easier to type. Only `PiniaColada`
  has this option, **it has been removed from useQuery**. Overall, the
  option still needs more thinking and will probably change in the future
  again.
- **plugins:** The `onSuccess`, `onError`, and `onSettled` global
  hooks have been moved from `PiniaPlugin` to a Pinia Colada plugin:
  `PiniaColadaQueryHooksPlugin`

  ```diff
   app.use(PiniaColada, {
  +  plugins: [
  +    PiniaColadaQueryHooksPlugin({
         onSuccess() {},
         onError() {},
         onSettled() {},
  +    }),
  +  ],
   })
  ```

- This feature splits up the `status` state into two
  different _status_ properties:

- `status` is now just for the data `'pending' | 'success' | 'error'`
- `queryStatus` tells if the query is still running or not with `'idle' |
'running'`

- `refetch`, `refresh` and similar methods now resolve
  the `state` property without rejecting. This is usually more convenient.
- The `QueryStatus` type has been split into
  `DataStateStatus` and `OperationStateStatus`.
- the cache store is going through a refactor to empower
  plugins. **This change shouldn't affect end users unless you are
  directly using the cache store**.
  As a result a lot of the actions have been renamed

- refetch -> fetch
- invalidateEntry -> invalidate
- ensureEntry -> ensure

Their arguments have changed as well.

- This release removes the deprecated `QueryPlugin`. Use
  `PiniaColada` instead.

### Features

- add a `state` property to `useQuery` for type narrowing ([22f3e21](https://github.com/posva/pinia-colada/commit/22f3e216c03ee4e7e536fa3e4c8f4fad42717daf))
- **mutation:** refetch active queries ([#65](https://github.com/posva/pinia-colada/issues/65)) ([3ebc734](https://github.com/posva/pinia-colada/commit/3ebc734468305750d5ea132f73db78d52cef9180))
- **plugins:** Refactor query global hooks into a plugin ([bbe5199](https://github.com/posva/pinia-colada/commit/bbe51992dfd548a77325a908c6a5a1aa0254420b))
- **query:** add `active` property to query entry ([994db63](https://github.com/posva/pinia-colada/commit/994db63ebbba91660ee9602dfbbd5797fe441524)), closes [#65](https://github.com/posva/pinia-colada/issues/65)
- split useMutation status like useQuery ([6c6078f](https://github.com/posva/pinia-colada/commit/6c6078fee55a3c82df038c7e66ba384882923c47))

### Code Refactoring

- rename `isFetching` to `isLoading` ([003f7a1](https://github.com/posva/pinia-colada/commit/003f7a162d475300f5ab7880fafefbde3c467716))
- rename cache store actions ([792ec6e](https://github.com/posva/pinia-colada/commit/792ec6ec16bebd01f24d5c0a24f66884d902ebc8))
- Replace QueryPlugin with PiniaColada ([2a3f3d9](https://github.com/posva/pinia-colada/commit/2a3f3d9b2c1fe23767765238094b2d753c0a8fc6))
- useQuery setup option now receives the options as the second argument ([a86b41d](https://github.com/posva/pinia-colada/commit/a86b41dd74a7bbbfc355c1dd19b7f40d96e8bab6))

## 0.7.1 (2024-07-30)

### Bug Fixes

- **hmr:** always update options ([a6a6b7a](https://github.com/posva/pinia-colada/commit/a6a6b7a209bfbff4cc0644ba40e6486a35166d1c))

## 0.7.0 (2024-07-26)

### ⚠ BREAKING CHANGES

- rename type `UseEntryKey` to `EntryKey`
- the exported type 'UseQueryKey' is replaced by the more generic type 'UseEntryKey', which will be also used to type mutations

### Features

- debug plugin ([8fde25b](https://github.com/posva/pinia-colada/commit/8fde25be458b4bf593ca0701679bbc9f404d7ea7))
- expose plugin types ([83ef198](https://github.com/posva/pinia-colada/commit/83ef1989bf537cccea66c386a29859c800208fe3))
- **mutation:** allow passing mutation variables to mutation key getter ([bc8a47f](https://github.com/posva/pinia-colada/commit/bc8a47fd18c4a4839f20d792383c48d84fa013b2))
- retry plugin ([0d837a2](https://github.com/posva/pinia-colada/commit/0d837a2e426fe3b046316e7462e21a890ad6f3ee))
- support plugins and deprecate `QueryPlugin` in favor of `PiniaColada` ([bde53d9](https://github.com/posva/pinia-colada/commit/bde53d9e1045ecf433820bc1d21a57f56cc62b27))
- **use-query:** Add enabled option ([#43](https://github.com/posva/pinia-colada/issues/43)) ([1b755c5](https://github.com/posva/pinia-colada/commit/1b755c5183526f60cb0a3169b363cda1f8bbb659))
- **wip:** add gcTime ([#29](https://github.com/posva/pinia-colada/issues/29)) ([56659d1](https://github.com/posva/pinia-colada/commit/56659d1c31a3208756a5361ac97b8f274b2b6533))

### Bug Fixes

- gcTime on defined queries ([#50](https://github.com/posva/pinia-colada/issues/50)) ([82df409](https://github.com/posva/pinia-colada/commit/82df409c13a166c3c1a54a121029740e103d2a52))
- **query:** query refresh on defineQuery output composable call ([28a3ec1](https://github.com/posva/pinia-colada/commit/28a3ec1741b38b8f672c90badbc38327813e1238))
- trigger nested actions ([7e3a9f6](https://github.com/posva/pinia-colada/commit/7e3a9f6d2582ddab4d7bed4943899bcff7c1ced2))

### Reverts

- Revert "refactor: add a stale getter" ([6e059f4](https://github.com/posva/pinia-colada/commit/6e059f4769c147c567ef4fdeb192570cb3f634d4))

### Code Refactoring

- rename type 'UseQueryKey' to 'UseEntryKey' ([6a32d89](https://github.com/posva/pinia-colada/commit/6a32d894a61d3af5c2e8f549c59aba1c28425ba8))
- rename type `UseEntryKey` to `EntryKey` ([8110feb](https://github.com/posva/pinia-colada/commit/8110feb9fd0f0e5372574a7f4dc6b9707b1a59a7))

## 0.6.0 (2024-04-02)

### ⚠ BREAKING CHANGES

- **mutation:** Rename type `UseQueryStatus` to `QueryStatus`
- **mutation:** `mutate` no longer returns a promise and catches errors
  to be safely used in templates. The old behavior remains the same with
  `mutateAsync`
- **mutation:** the `mutation` option in `useMutation()` now only
  accepts one argument for the variables. This allows to add extra
  parameters in the future like a signal, an extra context, etc

### Features

- abort pending query signal on new query ([6b6195f](https://github.com/posva/pinia-colada/commit/6b6195fbf747b8f5d040912307501657e6b4d45d))
- allow typing the error with transformError ([fd35f6f](https://github.com/posva/pinia-colada/commit/fd35f6fd67901322a8a3580886e4ae5b73f2743f))
- **mutation:** add mutateAsync ([5c97b69](https://github.com/posva/pinia-colada/commit/5c97b69070595b2b654cba7d5e8aa8fb7309c1fc))
- **mutation:** allow passing the context to mutation ([b9acca0](https://github.com/posva/pinia-colada/commit/b9acca02bbd68b86f09dd67efd450833e71ed69a))
- **mutation:** defineMutation wip ([5866907](https://github.com/posva/pinia-colada/commit/5866907bac550138cc54734b47d66eb9f6ade982))
- **mutation:** require one argument only for useMutation ([86b5996](https://github.com/posva/pinia-colada/commit/86b5996cc4c7510b27c32f9c627c3d568c1f0c0d))
- **query:** add data and errors to global hooks ([b4caeca](https://github.com/posva/pinia-colada/commit/b4caeca07009c92c5a271641e9ebd7f31f2d82cc))
- **query:** defineQuery ([e0f7768](https://github.com/posva/pinia-colada/commit/e0f7768a5ab274956da1368b3fd3c2cf4a8dbd6d))
- return promise when invalidating query ([c431284](https://github.com/posva/pinia-colada/commit/c4312849df5ec6d9e8eae306d567bae3190cfe58))
- **useMutation:** add hook context ([0894a81](https://github.com/posva/pinia-colada/commit/0894a81e52b8882322a574db49162d45558e0f77))
- **useMutation:** add hooks ([c44af13](https://github.com/posva/pinia-colada/commit/c44af132ffbee94cd0678e3ec7a2b9c21ee3054c))

### Code Refactoring

- **mutation:** rename UseQueryStatus to QueryStatus ([ff0067a](https://github.com/posva/pinia-colada/commit/ff0067a39de4cce04e285a041a43c36775cad4ea))

## 0.5.3 (2024-02-21)

### Bug Fixes

- onScopeDispose guard ([0ed15fe](https://github.com/posva/pinia-colada/commit/0ed15fe45e3d381bde73ef0557ab98ad8871e3ea))

## 0.5.2 (2024-02-20)

### Bug Fixes

- allow writing to entries ([8e9ac7e](https://github.com/posva/pinia-colada/commit/8e9ac7e35713a40f0160584a5a8bc17c520129b4))

## 0.5.1 (2024-02-19)

### Features

- **types:** allow default error type ([68c2f8d](https://github.com/posva/pinia-colada/commit/68c2f8d251b26bdf33c7bf6665697d48316159e3))

### Bug Fixes

- avoid computed warns ([c11ee2f](https://github.com/posva/pinia-colada/commit/c11ee2f863f527eba42929bbe61b855db8810f36))

## 0.5.0 (2024-02-19)

### ⚠ BREAKING CHANGES

- remove internal global defaults
- force array of keys to avoid easy mistakes

### Features

- pass signal to query ([bf1666c](https://github.com/posva/pinia-colada/commit/bf1666c0d235085db7e10d19b690bfab04af813c))

### Code Refactoring

- force array of keys to avoid easy mistakes ([7d95da0](https://github.com/posva/pinia-colada/commit/7d95da0cd925836f830a80d3eaeae5ee11c9f8b7))
- remove internal global defaults ([53ce0bc](https://github.com/posva/pinia-colada/commit/53ce0bcbfcf465d43b60fe6ca2be3b2b2b2c1ce4))

## 0.4.3 (2024-02-11)

### Features

- add delayLoadingRef ([ebbc503](https://github.com/posva/pinia-colada/commit/ebbc5034321c5274a032eee898503bd97207e276))

## 0.4.2 (2024-02-08)

### Bug Fixes

- avoid warn onScopeDispose ([47ac1a6](https://github.com/posva/pinia-colada/commit/47ac1a6b9cf051e7d6979f7f83cdce8dc8dbb6de))

## 0.4.1 (2024-02-07)

## 0.4.0 (2024-02-06)

### ⚠ BREAKING CHANGES

- rename data fetching store
- replace class usage
- add `QueryPlugin` to configure useQuery()
- `status` property, `isPending`, `isFetching` are now a
  bit different.

### Features

- **ssr:** wip initial version ([8e6cbf6](https://github.com/posva/pinia-colada/commit/8e6cbf6caf3c4154213680fdd216c7c0262a72ea))

### Code Refactoring

- adapt status ([2d5625c](https://github.com/posva/pinia-colada/commit/2d5625c81efdf44932a1e85142fc67dcff3040b0))
- add `QueryPlugin` to configure useQuery() ([67cb2d3](https://github.com/posva/pinia-colada/commit/67cb2d37382c50179c662509b2eb8322de4a13e3))
- rename data fetching store ([b9ef0fb](https://github.com/posva/pinia-colada/commit/b9ef0fb838135b6fa62fd74ace03d00590826de5))
- replace class usage ([9bf1fd9](https://github.com/posva/pinia-colada/commit/9bf1fd9295e20a4dc0165deea2e5e55afd5bf2b2))

## 0.3.1 (2024-02-03)

### Bug Fixes

- **useMutation:** options ([23eccb1](https://github.com/posva/pinia-colada/commit/23eccb11f0d9d77d29ec55a7158748887e6e396c))

## 0.3.0 (2024-02-03)

### ⚠ BREAKING CHANGES

- The option `fetcher` for `useQuery()` has been renamed
  to `query`. The option `mutator` for `useMutation()` has been renamed
  `mutation`.

### Code Refactoring

- rename options for `useQuery` and `useMutation` ([28ecc75](https://github.com/posva/pinia-colada/commit/28ecc757473b17cf5ae8579250faa197232c0988))

## 0.2.0 (2024-01-16)

### ⚠ BREAKING CHANGES

- remove iife version

### Features

- accept function in setEntryData ([2abb7c0](https://github.com/posva/pinia-colada/commit/2abb7c0030a7540ec4b57bddd7f415dee86fe6cc))
- allow array of keys ([7be2e80](https://github.com/posva/pinia-colada/commit/7be2e80602357333248fe040b9fe173dbb5ffa65))
- do not refresh by default outside of components ([b6e45fb](https://github.com/posva/pinia-colada/commit/b6e45fbe40b302b6e5bbea7acadb6a1fe28f6e0c))
- traverse tree map ([b12547f](https://github.com/posva/pinia-colada/commit/b12547fab33bd4108ddba0611ffad66efecc0812))
- wip tree map ([b87bff4](https://github.com/posva/pinia-colada/commit/b87bff433a9a0192189c019d3e2912f09d95a084))

### Bug Fixes

- only use onServerPrefetch in components ([445921a](https://github.com/posva/pinia-colada/commit/445921a14583d18519c379c18762e373fb12e027))
- recompute based on key ([c9d739f](https://github.com/posva/pinia-colada/commit/c9d739ffd2328b1795319526d5069bd534f3f44e))

### Performance Improvements

- avoid creating children on tree ([0bdbe1d](https://github.com/posva/pinia-colada/commit/0bdbe1d95eed351293a635019ccd29ff574ba81e))
- use shallowRef for internal primitives ([6b9e5e3](https://github.com/posva/pinia-colada/commit/6b9e5e3362c70057d96e61ba53d896fc6e64bfa5))

### Build System

- remove iife version ([0ee5c8a](https://github.com/posva/pinia-colada/commit/0ee5c8a7af2793aeb640261583ea89db3b425967))

## 0.1.0 (2023-12-25)

### ⚠ BREAKING CHANGES

- rename options

### Bug Fixes

- swallow error in automatic refreshes ([d955754](https://github.com/posva/pinia-colada/commit/d9557545fd6716929d5e127cf6b8e125c5cd23d7))

### Code Refactoring

- rename options ([f6d01c5](https://github.com/posva/pinia-colada/commit/f6d01c5396fb9495e3685f94d7fa24cff81b2da3))

## 0.0.1 (2023-12-20)

### Features

- initial version ([7abe80d](https://github.com/posva/pinia-colada/commit/7abe80dd93f46a9a03d94dc541785107a278ce60))
