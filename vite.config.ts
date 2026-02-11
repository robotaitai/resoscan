import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // GitHub Pages serves from /<repo-name>/.
  // Electron needs './' for file:// protocol.
  // Set VITE_BASE=./ when building for Electron.
  base: process.env.VITE_BASE ?? '/ResoScan/',

  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['node_modules', 'dist', 'e2e'],
  },
})
