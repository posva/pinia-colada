// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
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
      'style/arrow-parens': ['error', 'always'],
      'no-console': 'warn',
      'style/indent': 'off',
      'style/indent-binary-ops': 'off',
      'ts/no-use-before-define': 'off',
    },
  },
  {
    files: ['playground/**/*'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['docs/**/*', '!docs/.vitepress/**/*'],
    rules: {
      'import/order': ['off'],
    },
  },
)
