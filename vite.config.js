import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/chapa': {
        target: 'https://api.chapa.co/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chapa/, '')
      }
    }
  }
})