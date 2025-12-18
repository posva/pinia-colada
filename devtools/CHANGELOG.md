# [0.3.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.2.1...@pinia/colada-devtools@0.3.0) (2025-12-18)

- fix!: remove devtools from production builds ([a3b3bab](https://github.com/posva/pinia-colada/commit/a3b3bab22e8cb5e7d50d1cbe6c861fe2a2854cc8))

### Bug Fixes

- use own local storage key ([feeec6d](https://github.com/posva/pinia-colada/commit/feeec6d745acdc35b0374771ff97299c20595670)), closes [#444](https://github.com/posva/pinia-colada/issues/444) [#445](https://github.com/posva/pinia-colada/issues/445)

### Features

- json-viewer for data, options, vars ([82c1b09](https://github.com/posva/pinia-colada/commit/82c1b0953698ff75c310506c6ecd34d2a8411f19))

### BREAKING CHANGES

- this removes the `disabled` prop from the `<PiniaColadaDevtools>` component. If you want devtools in production use the `<PiniaColadaProdDevtools>`.

## [0.2.1](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.2.0...@pinia/colada-devtools@0.2.1) (2025-12-17)

### Features

- **devtools:** editable data ([3db63a8](https://github.com/posva/pinia-colada/commit/3db63a865054bada72b06433bb9d309e3f15dec9))
- thiner scrollbar ([53893e6](https://github.com/posva/pinia-colada/commit/53893e6cd672784391359edc2decba8a1c6359ed))

# [0.2.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.9...@pinia/colada-devtools@0.2.0) (2025-12-16)

### Bug Fixes

- add hydrated data to queries ([6b59dd1](https://github.com/posva/pinia-colada/commit/6b59dd1713ad15a61f79ae30fa35ff1f72a36167))
- set updatedAt based on entry.when ([b8d4753](https://github.com/posva/pinia-colada/commit/b8d475359ba55aaff91e69dbe10cef631dba766e))
- use global options for mutations ([0f3a56c](https://github.com/posva/pinia-colada/commit/0f3a56ce94fd5a49e17cd3883e074f2e04098d9b))

### Features

- inactive mutations ([721d86e](https://github.com/posva/pinia-colada/commit/721d86e9ab4ef98b87c151645c6d804c018a1480))
- mutations ([aad21bb](https://github.com/posva/pinia-colada/commit/aad21bb46e4153d40d68b1d2126618168585367c))
- mutations ([13af68b](https://github.com/posva/pinia-colada/commit/13af68bf1f37227ccc97862ac1531942bbb7b4de))
- replay mutation ([ef54785](https://github.com/posva/pinia-colada/commit/ef547855b3e3649d17b89946118bad5313121ab2))
- display date ([675c569](https://github.com/posva/pinia-colada/commit/675c56960c9dd40db5e6fbb18796da9498d05c51))
- display date for anonymous mutations ([315c029](https://github.com/posva/pinia-colada/commit/315c0296565ec1e3f618bc32f0c8ef9b7ed4bf14))
- display empty list placeholder ([208adb9](https://github.com/posva/pinia-colada/commit/208adb9f6cc686cfe97b6d457a785e3b892e0ca6))
- display more minutes ([b8aadb6](https://github.com/posva/pinia-colada/commit/b8aadb6529267710dae7d407831086b6da06c1be))
- fix replay ([fb97d9e](https://github.com/posva/pinia-colada/commit/fb97d9e2fad0bf63df9295fd77e8980bcc05962e))
- message of missing query key ([b03e727](https://github.com/posva/pinia-colada/commit/b03e7270962d62623ffefc13df064b89deccebae))

## [0.1.9](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.8...@pinia/colada-devtools@0.1.9) (2025-11-24)

Dependencies updates.

## [0.1.8](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.7...@pinia/colada-devtools@0.1.8) (2025-10-30)

No changes in this release.

## [0.1.7](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.6...@pinia/colada-devtools@0.1.7) (2025-09-25)

No changes in this release.

## [0.1.6](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.5...@pinia/colada-devtools@0.1.6) (2025-08-25)

### Features

- **devtools:** better JSON display ([#310](https://github.com/posva/pinia-colada/issues/310)) ([ae0dd16](https://github.com/posva/pinia-colada/commit/ae0dd1657b199f39cd86e87c2e047f7dbdf34bd0))
- **devtools:** Enhance serialization with type safety and optimized binary data handling ([#356](https://github.com/posva/pinia-colada/issues/356)) ([640f730](https://github.com/posva/pinia-colada/commit/640f73003264e1ad8483317fd6e562fc0cf4a5b3))

### Bug Fixes

- display collections ([ecf716c](https://github.com/posva/pinia-colada/commit/ecf716c41993a7e207709e4e9d2268b66d984523))

## [0.1.5](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.4...@pinia/colada-devtools@0.1.5) (2025-06-16)

### Bug Fixes

- display devtools in dev by default ([f126e6e](https://github.com/posva/pinia-colada/commit/f126e6e5921ebaf5f501612b2c881b0ae176e632)), closes [/github.com/posva/pinia-colada/issues/314#issuecomment-2975403537](https://github.com/posva//github.com/posva/pinia-colada/issues/314/issues/issuecomment-2975403537)

## [0.1.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.3...@pinia/colada-devtools@0.1.4) (2025-06-15)

### Bug Fixes

- bundle custom element in production mode ([76cef7a](https://github.com/posva/pinia-colada/commit/76cef7aca62d7364eea4fd23caee26c6681de04a)), closes [#314](https://github.com/posva/pinia-colada/issues/314)
- ensure max height of panel ([caf5a55](https://github.com/posva/pinia-colada/commit/caf5a55f501b882fad877dfebcd999d93e8d368e))

## [0.1.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.2...@pinia/colada-devtools@0.1.3) (2025-06-13)

### Bug Fixes

- height of devtools ([1fd761b](https://github.com/posva/pinia-colada/commit/1fd761b3f0753c3091e7c2cd2bfd362666d545ab))

### Performance Improvements

- avoid select on safari ([7a7d803](https://github.com/posva/pinia-colada/commit/7a7d803bce66d6811898f02703d2c43046639c89))

## [0.1.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.1...@pinia/colada-devtools@0.1.2) (2025-06-05)

### Bug Fixes

- safari ([dc22a3e](https://github.com/posva/pinia-colada/commit/dc22a3eeb024e546cf2259ae84999d1a055295b6))

## [0.1.1](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.1.0...@pinia/colada-devtools@0.1.1) (2025-06-04)

### Bug Fixes

- keep queryCache actions ([ef9db0b](https://github.com/posva/pinia-colada/commit/ef9db0b38be0f700cdd99ab089b0dfe558ffa1f5))

## [0.1.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.6...@pinia/colada-devtools@0.1.0) (2025-06-03)

### Features

- add button to close devtools ([0d7ebe1](https://github.com/posva/pinia-colada/commit/0d7ebe1c8a724f144e509a64d16f8bf540ae1cda))
- allow forcing devtools in production ([18b11fb](https://github.com/posva/pinia-colada/commit/18b11fbc3ffac5f7a6f561841850d5356ca7156d))

## [0.0.6](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.5...@pinia/colada-devtools@0.0.6) (2025-06-03)

### Features

- add ResizablePanel component ([#266](https://github.com/posva/pinia-colada/issues/266)) ([206b53a](https://github.com/posva/pinia-colada/commit/206b53aa479f426ca9eea8b4763cfa4ed975d942))

## [0.0.5](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.4...@pinia/colada-devtools@0.0.5) (2025-05-23)

### Bug Fixes

- use keyHash as id ([1c0eaab](https://github.com/posva/pinia-colada/commit/1c0eaab3e3b51a472526dda7cc58a66444c302d4))

## [0.0.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.3...@pinia/colada-devtools@0.0.4) (2025-05-23)

### Bug Fixes

- improve devtools shadowRoot detection ([a803580](https://github.com/posva/pinia-colada/commit/a803580e7eaad7b63704d3ae02600c12ba572f8b))

## [0.0.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.2...@pinia/colada-devtools@0.0.3) (2025-05-23)

### Bug Fixes

- add devtools info on existing entries ([47c86dc](https://github.com/posva/pinia-colada/commit/47c86dc15e5230a3e5426af7851e2f7b0dbfb7cf))

## [0.0.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.0.1...@pinia/colada-devtools@0.0.2) (2025-05-23)

### Bug Fixes

- remove warnings ([873b691](https://github.com/posva/pinia-colada/commit/873b6916172b3236f81162e8d81805b2dbada67d))

### Reverts

- Revert "build: fix" ([8569527](https://github.com/posva/pinia-colada/commit/85695270b49dcc4341c78a2af9c09a0de717a90c))

## 0.0.1 (2025-05-21)

Initial release of the devtools. They are still experimental and should not be included in production code.
