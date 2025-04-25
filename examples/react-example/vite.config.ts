import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3006,
    host: '172.31.31.20'
  },
  build: {
    outDir: './build',
    emptyOutDir: true
  },
  plugins: [react()]
})
