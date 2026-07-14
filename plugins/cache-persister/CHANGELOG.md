# [1.1.0](https://github.com/posva/pinia-colada/compare/%40pinia%2Fcolada-plugin-cache-persister%401.0.0...%40pinia%2Fcolada-plugin-cache-persister%401.1.0) (2026-07-14)

### Features

- **cache-persister:** allow custom cache serialization ([#611](https://github.com/posva/pinia-colada/issues/611)) ([cc52aa6](https://github.com/posva/pinia-colada/commit/cc52aa695d80e9208f9f5f22e66a212a63644e3d))
- onError handlers for writnig and reading ([8f93e1c](https://github.com/posva/pinia-colada/commit/8f93e1c37abe039d85364520b4e81b0ca48b36b3))
- use nostics for better errors ([aa8c8a3](https://github.com/posva/pinia-colada/commit/aa8c8a3601ca6d70f43c154bbbd6c5795bb8927e))

# [1.0.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.1.4...@pinia/colada-plugin-cache-persister@1.0.0) (2026-04-20)

### Bug Fixes

- **cache-persister:** await captured promise on async restore ([#562](https://github.com/posva/pinia-colada/issues/562)) ([7370e41](https://github.com/posva/pinia-colada/commit/7370e41fc29e0e588b7a6d59cbe8f59f8144c5d1))
- **cache-persister:** guard localStorage.clear() for Node 25+ ([c29c61d](https://github.com/posva/pinia-colada/commit/c29c61d22ebc62625faec769ab4f6f5c7ddc1157))

## [0.1.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.1.3...@pinia/colada-plugin-cache-persister@0.1.4) (2026-03-06)

No changes in this release.

## [0.1.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.1.2...@pinia/colada-plugin-cache-persister@0.1.3) (2026-01-09)

No changes in this release.

## [0.1.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.1.1...@pinia/colada-plugin-cache-persister@0.1.2) (2026-01-07)

### Bug Fixes

- serialize the key hash too ([54a142b](https://github.com/posva/pinia-colada/commit/54a142b49cd0650d9cda467b96ec75e8d701658e))

## [0.1.1](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.1.0...@pinia/colada-plugin-cache-persister@0.1.1) (2026-01-06)

### Bug Fixes

- avoid extra tick ([0f536f5](https://github.com/posva/pinia-colada/commit/0f536f53a96653baf83fa9f6cab92cfb39dd979b))
- only persist success ([11b3577](https://github.com/posva/pinia-colada/commit/11b357797c19d40e81ef9a4df0786479ddae9f50))

# [0.1.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.0.5...@pinia/colada-plugin-cache-persister@0.1.0) (2026-01-06)

- refactor!: remove CJS support ([458071a](https://github.com/posva/pinia-colada/commit/458071a3a16f7f93ecde6b0816ae61239769526f))

### Features

- implement cache persister plugin ([bd65c16](https://github.com/posva/pinia-colada/commit/bd65c1632e6478dafe68694cd1ceed9e64836518)), closes [#455](https://github.com/posva/pinia-colada/issues/455)

### BREAKING CHANGES

- ESM have been natively supported in node since 18 and
  is now required.

## [0.0.5](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.0.4...@pinia/colada-plugin-cache-persister@0.0.5) (2025-12-16)

No changes in this release.

## [0.0.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.0.3...@pinia/colada-plugin-cache-persister@0.0.4) (2025-10-30)

No changes in this release.

## [0.0.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.0.2...@pinia/colada-plugin-cache-persister@0.0.3) (2025-04-25)

### Bug Fixes

- loose peer dep requirement until v1 ([a7cd094](https://github.com/posva/pinia-colada/commit/a7cd09461b45f8b2c3255016c3a9e4d6abb0242d)), closes [#264](https://github.com/posva/pinia-colada/issues/264)

## [0.0.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-plugin-cache-persister@0.0.1...@pinia/colada-plugin-cache-persister@0.0.2) (2024-11-09)

No Changes.

## 0.0.1 (2024-10-25)
