import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router') ||
              id.includes('/react-router-dom/')
            ) {
              return 'vendor-react'
            }
            if (
              id.includes('/recharts/') ||
              id.includes('/d3-') ||
              id.includes('/victory-vendor/')
            ) {
              return 'vendor-charts'
            }
            if (id.includes('/framer-motion/')) {
              return 'vendor-motion'
            }
            if (id.includes('/lucide-react/')) {
              return 'vendor-icons'
            }
            if (id.includes('/axios/')) {
              return 'vendor-network'
            }
          }
        },
      },
    },
  },
})
