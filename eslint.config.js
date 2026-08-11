import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },

  // 通用 TS/TSX
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // domain 層：第二道防線（第一道是 scripts/check-domain-purity.mjs）
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'domain 層不得存取瀏覽器 API（SPEC.md P1）。',
        },
        {
          name: 'document',
          message: 'domain 層不得存取瀏覽器 API（SPEC.md P1）。',
        },
        {
          name: 'localStorage',
          message: 'domain 層不得存取儲存體，請透過介面注入（SPEC.md P1）。',
        },
        {
          name: 'indexedDB',
          message: 'domain 層不得存取儲存體，請透過介面注入（SPEC.md P1）。',
        },
        {
          name: 'fetch',
          message: 'App 不得發出網路請求（SPEC.md P3）。',
        },
      ],
    },
  },

  // 測試檔放寬
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
