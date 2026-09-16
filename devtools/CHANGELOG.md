# [2.0.0](https://github.com/posva/pinia-colada/compare/%40pinia%2Fcolada-devtools%401.1.2...%40pinia%2Fcolada-devtools%402.0.0) (2026-09-16)

### Bug Fixes

- avoid infinite recursion on circular objects ([2f181cb](https://github.com/posva/pinia-colada/commit/2f181cbcf5e1a9a9ce06599ae14acdedc24b48d3))
- avoid NaN in circle progress ([55c8f27](https://github.com/posva/pinia-colada/commit/55c8f273e8101fe7ecb7dac8a67b131fa665cf2c))
- colors ([827d34f](https://github.com/posva/pinia-colada/commit/827d34f8a8bfee02a631a24c5420d540738c4675))
- **devtools:** display invalid dates ([e5ed206](https://github.com/posva/pinia-colada/commit/e5ed206d7b93567637fc6bc1913bf9b981cd9558))
- **devtools:** display negative zero ([bec62b2](https://github.com/posva/pinia-colada/commit/bec62b2baa01c186718b9a0f119c7b9156ba0f40))
- **devtools:** edit map and set values ([00d928a](https://github.com/posva/pinia-colada/commit/00d928a75b05a2a5cd0b28c9b46d5a5d3000b448))
- **devtools:** embed devframe icon ([6c4f56e](https://github.com/posva/pinia-colada/commit/6c4f56e184a0ae14a3ae5ffc6345846c8f258512))
- **devtools:** isolate shared cache payloads ([30f7d4b](https://github.com/posva/pinia-colada/commit/30f7d4b61d35fc6f2e83156a7994737a415f2f9e))
- **devtools:** keep router file watching defaults ([03375dd](https://github.com/posva/pinia-colada/commit/03375dde237529b739268b50d62a6e1359887a12))
- **devtools:** preserve custom values after edits ([60bf371](https://github.com/posva/pinia-colada/commit/60bf371da06e9b60f388847f7484bceec0f5a2dd))
- **devtools:** preserve dates in fixture output ([fe35a94](https://github.com/posva/pinia-colada/commit/fe35a94961af858e2f51ca3d2b3346ea2cff7d0f))
- **devtools:** preserve depth when restoring object properties ([d3f4b46](https://github.com/posva/pinia-colada/commit/d3f4b461743db07e4782f042184ddd9128264397))
- **devtools:** preserve details panel scroll position ([36e7c20](https://github.com/posva/pinia-colada/commit/36e7c20de2069dbb47b118668d6720194f6b8220))
- **devtools:** reject duplicate set replacements ([7347b29](https://github.com/posva/pinia-colada/commit/7347b290129e0301b925addab1b5947958013dea))
- **devtools:** render circular fixture data ([47584ae](https://github.com/posva/pinia-colada/commit/47584ae84c8dc6b04eb775c88a40582c5dd7114b))
- **devtools:** replace edited data root ([de7aaf7](https://github.com/posva/pinia-colada/commit/de7aaf7f70a7aedf0c2e2ea3bb6876f51c5a7335))
- **devtools:** resolve standalone hub icon ([ae8fb54](https://github.com/posva/pinia-colada/commit/ae8fb544d465157f1c21b330d303363688e8efb3))
- **devtools:** restore package build ([e67a50c](https://github.com/posva/pinia-colada/commit/e67a50c5e2040b68d5cba45fb50425fd5ec8dc8e))
- **devtools:** restore serialized display values ([aa20b66](https://github.com/posva/pinia-colada/commit/aa20b6682d4478e64d0e22e074bd1c9a0bfb6d0f))
- **devtools:** retain native values after edits ([67a5d69](https://github.com/posva/pinia-colada/commit/67a5d698979a4a73cc13176a30f1721449d3d0f3))
- **devtools:** show simulated loading immediately when asyncStatus writes are deferred ([44ee12c](https://github.com/posva/pinia-colada/commit/44ee12cd72fa9e17d62ab76d81177d5f9f564559))
- **devtools:** stringify fixture BigInts ([5744df7](https://github.com/posva/pinia-colada/commit/5744df7e52ab5b67109611010d22e67bb5cb0a67))
- **devtools:** sync mutations started before bridge ([8090f2a](https://github.com/posva/pinia-colada/commit/8090f2afb5c6d67c511f03eaaf960708aaed183f))
- **devtools:** sync queries started before bridge ([ab3f60a](https://github.com/posva/pinia-colada/commit/ab3f60ab629ba8e8595e582715c6c7e493c6ee10))
- **devtools:** synchronize panel lifecycle ([1f4a025](https://github.com/posva/pinia-colada/commit/1f4a025a91f81a3cd405c10387665161fb185cbe))
- **devtools:** trigger query updates after edits ([2fd69ac](https://github.com/posva/pinia-colada/commit/2fd69ace9393e374df08957bc9764d422a8689fb))
- missing emit ([78dff4a](https://github.com/posva/pinia-colada/commit/78dff4a5fe7fe3150b8aed1da73418d70420feb6))
- promise state display in devtools ([778db91](https://github.com/posva/pinia-colada/commit/778db914711302a7788d7a874e1397be6e8fa150))
- restore shared state values consistently ([67e923a](https://github.com/posva/pinia-colada/commit/67e923a6f756d2c073fa7a49bc295b0a48f1fcdd))
- vertical layout ([6e5d7b5](https://github.com/posva/pinia-colada/commit/6e5d7b513b42b78939424a61bcf4f71c245fe0a7))

### Features

- avoid reload ([48b7101](https://github.com/posva/pinia-colada/commit/48b7101ec39316cebf4da8c0f398de0094da63ea))
- better autoscroll for colllapsables ([363b147](https://github.com/posva/pinia-colada/commit/363b14771a0913dfef5f67e40001bbceed09ac6a))
- **devtools:** add standalone Vite hub plugin ([35ca1aa](https://github.com/posva/pinia-colada/commit/35ca1aa21a9a55bafa2aeb681b6de7185e85ea70))
- **devtools:** colorize boxed values ([475c772](https://github.com/posva/pinia-colada/commit/475c772be9ade15ac33addb1216a52500850379d))
- **devtools:** colorize function parentheses ([e16254e](https://github.com/posva/pinia-colada/commit/e16254ec3f17987c5efad1d7a04b8950ccbb7fc0))
- **devtools:** colorize regular expressions ([5c8d3c4](https://github.com/posva/pinia-colada/commit/5c8d3c4ed62a40203c2eb5e14acd3884d6bd2100))
- **devtools:** display Blob metadata ([f210c39](https://github.com/posva/pinia-colada/commit/f210c394265df73a8a1312b74c18651ed675e593))
- **devtools:** display boxed numbers ([95bfcbb](https://github.com/posva/pinia-colada/commit/95bfcbb5d7462b481c126ed67092abd4525ae1b9))
- **devtools:** display boxed strings ([5ab0d25](https://github.com/posva/pinia-colada/commit/5ab0d25996475f44e15b1611067d1947102cd018))
- **devtools:** display circular references ([4b9134c](https://github.com/posva/pinia-colada/commit/4b9134c8465a20d8c54f1d9e06e7a19a7dc51b6b))
- **devtools:** display File metadata ([c393c51](https://github.com/posva/pinia-colada/commit/c393c5166f850bed864f0de319baa99efbf7352f))
- **devtools:** display repeated references ([5d0e7ed](https://github.com/posva/pinia-colada/commit/5d0e7edd946991241bae68d25dd1fdbca3008531))
- **devtools:** expand repeated references ([8797770](https://github.com/posva/pinia-colada/commit/87977704989069eeff2ff0ae365aa55ec1118158))
- **devtools:** expand rich value details ([803bd36](https://github.com/posva/pinia-colada/commit/803bd369414c8fddb1e8b0a5f25fca0dd3c663fa))
- **devtools:** handle missing colada instance ([9569544](https://github.com/posva/pinia-colada/commit/9569544673fd9b5fd91b9e76911b69d215d6b2e1))
- **devtools:** italicize function symbol ([caeb7b3](https://github.com/posva/pinia-colada/commit/caeb7b350d0360a6b81b4966e08cb7edc047d325))
- **devtools:** preserve aggregate errors ([35b966a](https://github.com/posva/pinia-colada/commit/35b966a512e86f474fbeecac5acf64d7ed1a75a5))
- **devtools:** preserve error causes ([7e9ee89](https://github.com/posva/pinia-colada/commit/7e9ee8975561cee660bb073e0dc31107f0a93300))
- **devtools:** preserve null-prototype objects ([2e140e2](https://github.com/posva/pinia-colada/commit/2e140e2bcdbe3b9aa95cb47aeebfdb17ce3e6ac1))
- **devtools:** refine callable value displays ([5ff77a8](https://github.com/posva/pinia-colada/commit/5ff77a88e9f32288d2b96b56115937084c7ec445))
- **devtools:** refine value syntax colors ([9492d76](https://github.com/posva/pinia-colada/commit/9492d76b601006114689f8e85c209ba1a11ae236))
- **devtools:** restore local development fixtures ([14265ec](https://github.com/posva/pinia-colada/commit/14265ece18826c415761e9ba23b6e43bfae1b165))
- **devtools:** serialize URL search params ([2ce7baa](https://github.com/posva/pinia-colada/commit/2ce7baa82fd526f359a2b2a617b2ece6c5928afd))
- **devtools:** serialize URL values ([d623f3d](https://github.com/posva/pinia-colada/commit/d623f3d65f78a1ad41f520d744f0f0bdeb7d1955))
- **devtools:** theme fixture playground ([09c9266](https://github.com/posva/pinia-colada/commit/09c9266f90aa9dbeca90dfccceae7d1a49afc447))
- **devtools:** vendor regex colorizer ([cbcb1cd](https://github.com/posva/pinia-colada/commit/cbcb1cd5d95ddbbeab2edea953af262009a48527))
- mcp integration ([1948b18](https://github.com/posva/pinia-colada/commit/1948b183249b262db2deacce03bf574fd3a99639))
- prepare for mcp support ([6e9c27d](https://github.com/posva/pinia-colada/commit/6e9c27d0494309a03def357b9885c9e04c8ccbc5))
- signal new data and errors ([0587869](https://github.com/posva/pinia-colada/commit/0587869f04e824c6d9b99b39a0a3ca6c0ef07e72))
- sticky keys in json viewer ([2eaa7da](https://github.com/posva/pinia-colada/commit/2eaa7dac2126d1f8da94cbbfb996ed7eaf15d106))
- sticky titles ([3939904](https://github.com/posva/pinia-colada/commit/3939904ae09ccff3e657240074180699c30ee045))
- support production devtools ([0b8d6c6](https://github.com/posva/pinia-colada/commit/0b8d6c612facaff02034236f568ba5b9a765003d))
- upgrade to devframe 1 ([26537ed](https://github.com/posva/pinia-colada/commit/26537ede82eb93cc378b8e337d9c51f14c8c0a50))

## [1.1.2](https://github.com/posva/pinia-colada/compare/%40pinia%2Fcolada-devtools%401.1.1...%40pinia%2Fcolada-devtools%401.1.2) (2026-07-22)

### Bug Fixes

- **types:** avoid types pollution ([5d56318](https://github.com/posva/pinia-colada/commit/5d56318a973ba28c47a712f590dd3aadd80527c3)), closes [#622](https://github.com/posva/pinia-colada/issues/622)

## [1.1.1](https://github.com/posva/pinia-colada/compare/%40pinia%2Fcolada-devtools%401.1.0...%40pinia%2Fcolada-devtools%401.1.1) (2026-07-14)

### Bug Fixes

- **devtools:** lazily initialize devtools info of entries ([#619](https://github.com/posva/pinia-colada/issues/619)) ([10d1ec1](https://github.com/posva/pinia-colada/commit/10d1ec16ca771e5f677d02551edecaba99862a8c)), closes [#618](https://github.com/posva/pinia-colada/issues/618)
- **devtools:** normalize component resolver path on Windows ([#615](https://github.com/posva/pinia-colada/issues/615)) ([88c9ee6](https://github.com/posva/pinia-colada/commit/88c9ee66a5f47ce64a65e32eb40772c8dae4a47e))

# [1.1.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@1.0.0...@pinia/colada-devtools@1.1.0) (2026-06-29)

### Bug Fixes

- prod removal of devtools ([60dc8fa](https://github.com/posva/pinia-colada/commit/60dc8fab371a647e4206d258ea31c7b2fcb47428))

### Features

- drag button devtools ([6580b69](https://github.com/posva/pinia-colada/commit/6580b6906c4e78c91d0e0c4d38d7e0bd6f71092c)), closes [#598](https://github.com/posva/pinia-colada/issues/598)
- subtle rotation animation in devtools button ([06d1058](https://github.com/posva/pinia-colada/commit/06d1058c371c92e35390e9bc56c1c7ccf662b945))
- upgrade types ([efc8d5f](https://github.com/posva/pinia-colada/commit/efc8d5fbab9a42aedaf0d397a3ec516431ea5ed5))

# [1.0.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.5...@pinia/colada-devtools@1.0.0) (2026-04-20)

No code changes in this release.

## [0.4.5](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.4...@pinia/colada-devtools@0.4.5) (2026-03-06)

No code changes in this release.

## [0.4.4](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.3...@pinia/colada-devtools@0.4.4) (2026-02-26)

### Bug Fixes

- clamp devtools height to minimum when reading from localStorage ([#521](https://github.com/posva/pinia-colada/issues/521)) ([7f0b82a](https://github.com/posva/pinia-colada/commit/7f0b82a31e09014e92fcfae07d327bbcce0593a5))

### Features

- **devtools:** surface retry plugin info in devtools plugins panel ([23822d0](https://github.com/posva/pinia-colada/commit/23822d0ddd5a1cf936ac4885c2a88de28c98133b))

## [0.4.3](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.2...@pinia/colada-devtools@0.4.3) (2026-02-22)

### Features

- **devtools:** distinguish prefetched queries in DevTools panel ([e99b8f6](https://github.com/posva/pinia-colada/commit/e99b8f62021a132bd69f8799161d6a494e9528be))
- improve hover titel ([6404b6a](https://github.com/posva/pinia-colada/commit/6404b6a79b88a4e04d9c19dc4b1d36edc3876110))

## [0.4.2](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.1...@pinia/colada-devtools@0.4.2) (2026-01-20)

### Bug Fixes

- correct GC time display for prefetched queries ([#464](https://github.com/posva/pinia-colada/issues/464)) ([80e2c5a](https://github.com/posva/pinia-colada/commit/80e2c5a59eb22b3a5bdadd5b8c21ceecc1b164ff))
- distinguish refetch and invalidate behavior in devtools ([#465](https://github.com/posva/pinia-colada/issues/465)) ([eeab2e4](https://github.com/posva/pinia-colada/commit/eeab2e428427fce37561bada64a9aff2a6322bb1))
- handle mutations created before devtools ([9305f79](https://github.com/posva/pinia-colada/commit/9305f79129dada0f712e3664b522e8ae9acc9ca0)), closes [#469](https://github.com/posva/pinia-colada/issues/469)

## [0.4.1](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.4.0...@pinia/colada-devtools@0.4.1) (2026-01-06)

### Features

- add number of queries/mutations to tabs ([58515f9](https://github.com/posva/pinia-colada/commit/58515f90117507bfb0f6b483ed779e9f3795a831))

# [0.4.0](https://github.com/posva/pinia-colada/compare/@pinia/colada-devtools@0.3.0...@pinia/colada-devtools@0.4.0) (2025-12-23)

### Bug Fixes

- higher z-index for button ([2b8e5a6](https://github.com/posva/pinia-colada/commit/2b8e5a653cf7225da6d918af36413e8e4f7b9a08))
- update mutations more often ([d2aecb4](https://github.com/posva/pinia-colada/commit/d2aecb45b4db53e3d9337a32c69131a62617c04a))

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
