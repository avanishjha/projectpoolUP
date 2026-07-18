import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/build/**', '**/.expo/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // CommonJS Node config files (metro, babel, etc.) legitimately use require/module.
    files: ['**/*.config.js', '**/metro.config.js'],
    languageOptions: { globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
