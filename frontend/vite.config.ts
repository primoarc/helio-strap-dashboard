import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // El frontend habla con el backend Python (adaptador Zepp) en /api
      '/api': 'http://localhost:8000',
    },
  },
})
