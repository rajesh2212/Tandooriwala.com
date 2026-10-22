import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const apiTarget = process.env.API_URL || 'http://localhost:8787'
const apiProxy = { '/api': { target: apiTarget, changeOrigin: true } } as const

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173, strictPort: false, proxy: apiProxy },
  preview: { host: true, port: 4173, proxy: apiProxy },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
