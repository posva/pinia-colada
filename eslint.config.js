import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'symbol-description': 'off',
    'node/prefer-global/process': 'off',
    'no-control-regex': 'off',
  },
})
