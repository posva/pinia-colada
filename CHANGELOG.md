# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
