import { PiniaColadaQueryHooksPlugin, type PiniaColadaOptions } from '@pinia/colada'

console.log('🔖 colada.options.ts')

export default {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onSettled(data, err, entry) {
        console.log(`Entry ${entry.key.join('/')} settled`)
      },
    }),
  ],
} satisfies PiniaColadaOptions
