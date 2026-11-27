import { readFile } from 'node:fs/promises'
import { builder } from '@nuxt/module-builder/tsdown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    builder(),
    {
      name: 'colada-build-types',
      async generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'types/build.d.ts',
          source: await readFile(new URL('./src/types/build.d.ts', import.meta.url)),
        })
      },
    },
  ],
})
