import tsdownConfig from './tsdown.config.js'

import { defineConfig } from 'vite-plus'

export default defineConfig({
  lib: tsdownConfig,
  lint: {
    $schema: '../node_modules/oxlint/configuration_schema.json',
    rules: {
      'no-console': 'off',
    },
  },
})
