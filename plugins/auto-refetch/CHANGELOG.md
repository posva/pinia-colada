## [0.2.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.2.2...@pinia/colada-plugin-auto-refetch@0.2.3) (2025-09-25)

No changes in this release.

## [0.2.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.2.1...@pinia/colada-plugin-auto-refetch@0.2.2) (2025-08-27)

### Bug Fixes

- auto refetch use fetch ([734fa72](https://github.com/posva/pinia-colada/commit/734fa725132958aeef7a45328db7ba14cdc8fa98)), closes [#373](https://github.com/posva/pinia-colada/issues/373)

## [0.2.1](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.2.0...@pinia/colada-plugin-auto-refetch@0.2.1) (2025-08-25)

### ⚠ BREAKING CHANGES

- `autoRefetch` no longer accepts Ref and Ref-like
  values, use the function getter instead. This change enables accessing
  the state of the query

### Features

- allow custom interval ([9585002](https://github.com/posva/pinia-colada/commit/95850024944023a416ffdb21556ecf924afe620a)), closes [#340](https://github.com/posva/pinia-colada/issues/340)

## [0.2.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.1.0...@pinia/colada-plugin-auto-refetch@0.2.0) (2025-06-03)

### Bug Fixes

- **types:** missing type param ([81497e7](https://github.com/posva/pinia-colada/commit/81497e7970cb68e8957a7cb8630f167496c41b14))

## [0.1.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.0.6...@pinia/colada-plugin-auto-refetch@0.1.0) (2025-05-21)

### Bug Fixes

- **types:** expose symbol key as internal ([8fe63e2](https://github.com/posva/pinia-colada/commit/8fe63e2273e057aa48e8c6981b01c37349467d6c))

### Code Refactoring

- **types:** rename `TResult` into TData ([09338a2](https://github.com/posva/pinia-colada/commit/09338a26a3b2b09463e457a1711900abe6bcdeff))

## [0.0.6](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.0.5...@pinia/colada-plugin-auto-refetch@0.0.6) (2025-04-25)

### Bug Fixes

- loose peer dep requirement until v1 ([a7cd094](https://github.com/posva/pinia-colada/commit/a7cd09461b45f8b2c3255016c3a9e4d6abb0242d)), closes [#264](https://github.com/posva/pinia-colada/issues/264)

## [0.0.5](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.0.4...@pinia/colada-plugin-auto-refetch@0.0.5) (2025-03-18)

### Bug Fixes

- **types:** add autoRefetch to globals ([42eaaea](https://github.com/posva/pinia-colada/commit/42eaaea02be803dac463f1c1bb26a0f70738271a)), closes [#225](https://github.com/posva/pinia-colada/issues/225)

## [0.0.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.0.3...@pinia/colada-plugin-auto-refetch@0.0.4) (2025-03-04)

This release contains no changes

## [0.0.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-auto-refetch@0.0.2...@pinia/colada-plugin-auto-refetch@0.0.3) (2025-02-01)

### Bug Fixes

- **types:** support getter ([017fcdc](https://github.com/posva/pinia-colada/commit/017fcdc844c19df91feec84221d28e0a56bd9455))

## 0.0.2 (2025-01-31)

### Features

- **plugins:** add auto-refetch plugin ([#97](https://github.com/posva/pinia-colada/issues/97)) ([dcf8c57](https://github.com/posva/pinia-colada/commit/dcf8c57a5c6695c02e046ba5e6731de71976a588))
