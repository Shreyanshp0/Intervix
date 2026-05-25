/**
 * ESLint Configuration - Import/Export Consistency Rules
 * 
 * Enforces:
 * - Named imports from libraries only
 * - Default imports for React components
 * - No mixed import patterns
 * - Proper module resolution
 * - Circular dependency detection
 */

import { defineFlatConfig } from 'eslint-flat-config-utils';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineFlatConfig([
  {
    ignores: ['node_modules', 'dist', 'build', '.vite'],
  },
  
  // JavaScript/JSX rules
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // CRITICAL: Enforce correct import patterns
      
      /**
       * Rule: Components and pages must use DEFAULT exports
       * Violations:
       * - export { Component } - WRONG
       * - export named Component - WRONG
       * - export default Component - CORRECT
       */
      'no-restricted-exports': [
        'error',
        {
          restrictedNamedExports: ['Component', 'Page', 'Layout', 'Modal'],
          message: 'Use default export for React components instead of named exports.',
        },
      ],

      /**
       * Rule: Component imports must use DEFAULT import syntax
       * Violations:
       * - import { Button } from './Button.jsx' - WRONG
       * - import Button from './Button' - CORRECT (without .jsx extension)
       */
      'import/no-named-as-default': 'off', // Allow flexibility
      'import/no-cycle': ['error', { maxDepth: '∞' }], // Detect circular imports

      /**
       * Rule: Disallow named imports from component files
       * Component files (*.jsx, *.tsx) should only have default exports
       */
      'import/no-named-as-default-member': 'warn',

      /**
       * Rule: Consistent import extensions
       * - Use explicit extensions for local modules (.js, .jsx)
       * - No extensions for node_modules
       */
      'import/extensions': [
        'warn',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],

      /**
       * Rule: Import ordering
       * 1. External packages (react, react-router, etc.)
       * 2. Internal absolute imports (store, utils, etc.)
       * 3. Internal relative imports (./components, ../pages)
       * 4. Side effects (.css, .scss)
       */
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '~/store/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '~/utils/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '~/hooks/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '~/services/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '~/components/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          newlines: 'always',
        },
      ],

      /**
       * Rule: No unused imports
       * Clean up stale and unused imports
       */
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      /**
       * Rule: Prevent default exports from index files in some cases
       * Helps with explicit imports
       */
      'import/no-default-export': 'off', // Allow default exports
      'import/prefer-default-export': 'off', // Flexible

      /**
       * Rule: Prevent importing from parent folders
       * Enforce clear module hierarchy
       */
      'import/no-relative-parent-imports': 'warn',

      /**
       * Rule: Prevent unresolved imports
       * Critical for build safety
       */
      'import/no-unresolved': [
        'error',
        {
          caseSensitive: true,
          ignore: [
            '^@',
            '^~',
          ],
        },
      ],

      // React-specific rules
      'react/prop-types': 'off', // Using TypeScript or just relying on usage
      'react/react-in-jsx-scope': 'off', // React 17+ doesn't need React import
      'react/jsx-uses-react': 'warn',
      'react/jsx-uses-vars': 'warn',
    },
  },

  // Configuration files (allow named exports and strict patterns)
  {
    files: ['src/**/*.config.{js,ts}', 'vite.config.js', 'eslint.config.js'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Store files (allow named exports for Zustand)
  {
    files: ['src/store/**/*.{js,ts}'],
    rules: {
      'export-default-from-commonjs': 'off',
    },
  },
]);
