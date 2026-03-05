import { defineConfig } from 'tsdown'
import { commonOptions } from '../tsdown.common.ts'

export default defineConfig([
  {
    ...commonOptions,
    globalName: 'PiniaColadaAutoRefetch',
  },
])
