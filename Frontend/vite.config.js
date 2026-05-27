import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

const backendTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  build: {
    emptyOutDir: true,
    assetsDir: 'assets',
    outDir: 'dist'
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_DEV_PORT || 5173),
    strictPort: false,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
