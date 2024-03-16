// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    //
    '**/*.ts.timestamp*',
  ],
  rules: {
    'symbol-description': 'off',
    'node/prefer-global/process': 'off',
    'no-control-regex': 'off',
    'curly': ['error', 'multi-line'],
    'antfu/if-newline': 'off',
    'style/brace-style': ['error', '1tbs'],
    'antfu/top-level-function': 'off',
    'test/prefer-lowercase-title': 'off',
    'style/yield-star-spacing': ['error', 'before'],
    'no-console': 'off',
  },
})
