# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.7.0](https://github.com/posva/pinia-colada/compare/v0.6.0...v0.7.0) (2024-07-26)


### ⚠ BREAKING CHANGES

* rename type `UseEntryKey` to `EntryKey`
* the exported type 'UseQueryKey' is replaced by the more generic type 'UseEntryKey', which will be also used to type mutations

### Features

* debug plugin ([8fde25b](https://github.com/posva/pinia-colada/commit/8fde25be458b4bf593ca0701679bbc9f404d7ea7))
* expose plugin types ([83ef198](https://github.com/posva/pinia-colada/commit/83ef1989bf537cccea66c386a29859c800208fe3))
* **mutation:** allow passing mutation variables to mutation key getter ([bc8a47f](https://github.com/posva/pinia-colada/commit/bc8a47fd18c4a4839f20d792383c48d84fa013b2))
* retry plugin ([0d837a2](https://github.com/posva/pinia-colada/commit/0d837a2e426fe3b046316e7462e21a890ad6f3ee))
* support plugins and deprecate `QueryPlugin` in favor of `PiniaColada` ([bde53d9](https://github.com/posva/pinia-colada/commit/bde53d9e1045ecf433820bc1d21a57f56cc62b27))
* **use-query:** Add enabled option ([#43](https://github.com/posva/pinia-colada/issues/43)) ([1b755c5](https://github.com/posva/pinia-colada/commit/1b755c5183526f60cb0a3169b363cda1f8bbb659))
* **wip:** add gcTime ([#29](https://github.com/posva/pinia-colada/issues/29)) ([56659d1](https://github.com/posva/pinia-colada/commit/56659d1c31a3208756a5361ac97b8f274b2b6533))


### Bug Fixes

* gcTime on defined queries ([#50](https://github.com/posva/pinia-colada/issues/50)) ([82df409](https://github.com/posva/pinia-colada/commit/82df409c13a166c3c1a54a121029740e103d2a52))
* **query:** query refresh on defineQuery output composable call ([28a3ec1](https://github.com/posva/pinia-colada/commit/28a3ec1741b38b8f672c90badbc38327813e1238))
* trigger nested actions ([7e3a9f6](https://github.com/posva/pinia-colada/commit/7e3a9f6d2582ddab4d7bed4943899bcff7c1ced2))


* rename type 'UseQueryKey' to 'UseEntryKey' ([6a32d89](https://github.com/posva/pinia-colada/commit/6a32d894a61d3af5c2e8f549c59aba1c28425ba8))
* rename type `UseEntryKey` to `EntryKey` ([8110feb](https://github.com/posva/pinia-colada/commit/8110feb9fd0f0e5372574a7f4dc6b9707b1a59a7))

## [0.6.0](https://github.com/posva/pinia-colada/compare/v0.5.3...v0.6.0) (2024-04-02)

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

- **mutation:** rename UseQueryStatus to QueryStatus ([ff0067a](https://github.com/posva/pinia-colada/commit/ff0067a39de4cce04e285a041a43c36775cad4ea))

### [0.5.3](https://github.com/posva/pinia-colada/compare/v0.5.2...v0.5.3) (2024-02-21)

### Bug Fixes

- onScopeDispose guard ([0ed15fe](https://github.com/posva/pinia-colada/commit/0ed15fe45e3d381bde73ef0557ab98ad8871e3ea))

### [0.5.2](https://github.com/posva/pinia-colada/compare/v0.5.1...v0.5.2) (2024-02-20)

### Bug Fixes

- allow writing to entries ([8e9ac7e](https://github.com/posva/pinia-colada/commit/8e9ac7e35713a40f0160584a5a8bc17c520129b4))

### [0.5.1](https://github.com/posva/pinia-colada/compare/v0.5.0...v0.5.1) (2024-02-19)

### Features

- **types:** allow default error type ([68c2f8d](https://github.com/posva/pinia-colada/commit/68c2f8d251b26bdf33c7bf6665697d48316159e3))

### Bug Fixes

- avoid computed warns ([c11ee2f](https://github.com/posva/pinia-colada/commit/c11ee2f863f527eba42929bbe61b855db8810f36))

## [0.5.0](https://github.com/posva/pinia-colada/compare/v0.4.3...v0.5.0) (2024-02-19)

### ⚠ BREAKING CHANGES

- remove internal global defaults
- force array of keys to avoid easy mistakes

### Features

- pass signal to query ([bf1666c](https://github.com/posva/pinia-colada/commit/bf1666c0d235085db7e10d19b690bfab04af813c))

- force array of keys to avoid easy mistakes ([7d95da0](https://github.com/posva/pinia-colada/commit/7d95da0cd925836f830a80d3eaeae5ee11c9f8b7))
- remove internal global defaults ([53ce0bc](https://github.com/posva/pinia-colada/commit/53ce0bcbfcf465d43b60fe6ca2be3b2b2b2c1ce4))

### [0.4.3](https://github.com/posva/pinia-colada/compare/v0.4.2...v0.4.3) (2024-02-11)

### Features

- add delayLoadingRef ([ebbc503](https://github.com/posva/pinia-colada/commit/ebbc5034321c5274a032eee898503bd97207e276))

### [0.4.2](https://github.com/posva/pinia-colada/compare/v0.4.1...v0.4.2) (2024-02-08)

### Bug Fixes

- avoid warn onScopeDispose ([47ac1a6](https://github.com/posva/pinia-colada/commit/47ac1a6b9cf051e7d6979f7f83cdce8dc8dbb6de))

### [0.4.1](https://github.com/posva/pinia-colada/compare/v0.4.0...v0.4.1) (2024-02-07)

- logs

## [0.4.0](https://github.com/posva/pinia-colada/compare/v0.3.1...v0.4.0) (2024-02-06)

### ⚠ BREAKING CHANGES

- rename data fetching store
- replace class usage
- add `QueryPlugin` to configure useQuery()
- `status` property, `isPending`, `isFetching` are now a
  bit different.

### Features

- **ssr:** wip initial version ([8e6cbf6](https://github.com/posva/pinia-colada/commit/8e6cbf6caf3c4154213680fdd216c7c0262a72ea))

- adapt status ([2d5625c](https://github.com/posva/pinia-colada/commit/2d5625c81efdf44932a1e85142fc67dcff3040b0))
- add `QueryPlugin` to configure useQuery() ([67cb2d3](https://github.com/posva/pinia-colada/commit/67cb2d37382c50179c662509b2eb8322de4a13e3))
- rename data fetching store ([b9ef0fb](https://github.com/posva/pinia-colada/commit/b9ef0fb838135b6fa62fd74ace03d00590826de5))
- replace class usage ([9bf1fd9](https://github.com/posva/pinia-colada/commit/9bf1fd9295e20a4dc0165deea2e5e55afd5bf2b2))

### [0.3.1](https://github.com/posva/pinia-colada/compare/v0.3.0...v0.3.1) (2024-02-03)

### Bug Fixes

- **useMutation:** options ([23eccb1](https://github.com/posva/pinia-colada/commit/23eccb11f0d9d77d29ec55a7158748887e6e396c))

## [0.3.0](https://github.com/posva/pinia-colada/compare/v0.2.0...v0.3.0) (2024-02-03)

### ⚠ BREAKING CHANGES

- The option `fetcher` for `useQuery()` has been renamed
  to `query`. The option `mutator` for `useMutation()` has been renamed
  `mutation`.

- rename options for `useQuery` and `useMutation` ([28ecc75](https://github.com/posva/pinia-colada/commit/28ecc757473b17cf5ae8579250faa197232c0988))

## [0.2.0](https://github.com/posva/pinia-colada/compare/v0.1.0...v0.2.0) (2024-01-16)

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

### build

- remove iife version ([0ee5c8a](https://github.com/posva/pinia-colada/commit/0ee5c8a7af2793aeb640261583ea89db3b425967))

## [0.1.0](https://github.com/posva/pinia-colada/compare/v0.0.1...v0.1.0) (2023-12-25)

### ⚠ BREAKING CHANGES

- rename options

### Bug Fixes

- swallow error in automatic refreshes ([d955754](https://github.com/posva/pinia-colada/commit/d9557545fd6716929d5e127cf6b8e125c5cd23d7))

- rename options ([f6d01c5](https://github.com/posva/pinia-colada/commit/f6d01c5396fb9495e3685f94d7fa24cff81b2da3))

### 0.0.1 (2023-12-20)

### Features

- initial version ([7abe80d](https://github.com/posva/pinia-colada/commit/7abe80dd93f46a9a03d94dc541785107a278ce60))
