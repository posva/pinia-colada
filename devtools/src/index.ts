export {
  /**
   * Pinia Colada Devtools as a Vue component. This component only renders in
   * development mode and gets stripped off in production builds. You can use
   * the {@link PiniaColadaProdDevtools} if you need it in production as
   * well.
   *
   * @example
   * Use directly in your `App.vue` root component:
   * ```vue
   * <script setup lang="ts">
   * import { PiniaColadaDevtools } from '@pinia/colada-devtools'
   * </script>
   *
   * <template>
   *   <RouterView />
   *   <PiniaColadaDevtools />
   * </template>
   * ```
   */
  default as PiniaColadaDevtools,
} from './ProductionWrapper.vue'
export {
  /**
   * Same as {@link PiniaColadaDevtools} but **doesn't get stripped off in
   * production**.
   */
  default as PiniaColadaProdDevtools,
} from './PCDevtoolsWrapper.vue'

declare global {
  const NODE_ENV: string
}
