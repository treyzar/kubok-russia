import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const alias = {
  '@': path.resolve(__dirname, './src'),
  '@app': path.resolve(__dirname, './src/app'),
  '@processes': path.resolve(__dirname, './src/processes'),
  '@pages': path.resolve(__dirname, './src/pages'),
  '@widgets': path.resolve(__dirname, './src/widgets'),
  '@features': path.resolve(__dirname, './src/features'),
  '@entities': path.resolve(__dirname, './src/entities'),
  '@shared': path.resolve(__dirname, './src/shared'),
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules/**'],
    alias,
  },
})
