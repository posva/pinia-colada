import { PiniaColadaQueryHooksPlugin } from '@pinia/colada'
import { defineColadaConfig } from '@pinia/colada-nuxt'

console.log('🔖 colada.config.ts')

export default defineColadaConfig({
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onSettled(data, err, entry) {
        console.log(`Entry ${entry.key.join('/')} settled`)
      },
    }),
  ],
})
