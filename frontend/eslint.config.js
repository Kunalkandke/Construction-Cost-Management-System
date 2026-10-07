export default [{
  files: ['**/*.{js,jsx}'],
  languageOptions: { ecmaVersion: 2023, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', URL: 'readonly', Blob: 'readonly', FormData: 'readonly', sessionStorage: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', performance: 'readonly', Intl: 'readonly', TextEncoder: 'readonly', location: 'readonly' } },
  rules: { 'no-undef': 'error' },
}, { ignores: ['dist/**', 'node_modules/**'] }];
