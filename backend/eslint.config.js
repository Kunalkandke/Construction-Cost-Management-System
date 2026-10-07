export default [
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' } },
    rules: { 'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^(req|res|next)$' }], 'no-undef': 'error' },
  },
  { ignores: ['node_modules/**'] },
];
