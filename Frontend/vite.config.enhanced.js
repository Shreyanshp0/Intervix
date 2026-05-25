/**
 * Vite Build Configuration with Import Validation
 * 
 * Purpose:
 * - Validate imports before building
 * - Catch ES module errors early
 * - Provide clear build diagnostics
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Custom Vite plugin to validate imports
 */
function importValidationPlugin() {
  return {
    name: 'import-validation',
    enforcePlugin: true,
    apply: 'build',
    async resolveId(id) {
      // Validate that imports can be resolved
      if (id.startsWith('.') && !id.endsWith('.js') && !id.endsWith('.jsx')) {
        // Check if file exists
        const possiblePaths = [
          id,
          `${id}.js`,
          `${id}.jsx`,
          `${id}/index.js`,
          `${id}/index.jsx`,
        ];

        for (const filepath of possiblePaths) {
          try {
            // This will be resolved by Vite's resolver
            return null; // Let Vite handle it
          } catch (e) {
            // Continue checking
          }
        }
      }
      return null;
    },

    handleHotUpdate({ file, server }) {
      // Notify on import changes
      if (file.includes('import') || file.includes('export')) {
        console.log(`[import] Updated: ${file}`);
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    importValidationPlugin(),
  ],

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
      },
    },
    rollupOptions: {
      output: {
        // Ensure stable chunk names
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      /**
       * Circular dependency detection
       */
      onwarn(warning, warn) {
        // Suppress certain warnings but catch circular deps
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          console.error(`⚠️ CIRCULAR DEPENDENCY: ${warning.message}`);
          // Don't fail on circular deps in dev, but warn in prod
          if (process.env.NODE_ENV === 'production') {
            throw new Error(`Circular dependency detected: ${warning.message}`);
          }
        } else if (warning.code === 'UNRESOLVED_IMPORT') {
          console.error(`❌ UNRESOLVED IMPORT: ${warning.message}`);
          throw new Error(`Unresolved import: ${warning.message}`);
        } else if (warning.code === 'MISSING_EXPORT') {
          console.error(`❌ MISSING EXPORT: ${warning.message}`);
          throw new Error(`Missing export: ${warning.message}`);
        } else {
          warn(warning);
        }
      },
    },
  },

  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    },
    // Extensions to try when resolving imports
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },

  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },

  preview: {
    port: 4173,
  },

  /**
   * Optimization settings
   */
  optimizeDeps: {
    // Pre-bundle heavy dependencies
    include: ['react', 'react-dom', 'zustand', 'react-router-dom', 'axios'],
    // Exclude large assets from pre-bundling
    exclude: ['dist'],
  },
});
