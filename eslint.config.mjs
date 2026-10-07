import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
export default [
  {
    ignores: [
      'public/**',
      'dist/**',
      'node_modules/**',
      'src/modules/alojamientos/entities/**',
      'src/modules/alojamientos/dto/create-*',
      'src/modules/alojamientos/dto/update-*',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['frontend/src/**/*.{js,jsx}', 'test/unit/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      'react/jsx-key': 'error',
      'react/no-danger': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      eqeqeq: 'error',
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['src/**/*.ts'] })),
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
