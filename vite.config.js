import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0', // Allow access from network/ngrok
    strictPort: false,
    // HMR sozlamasi - faqat Ngrok ishlatilganda kerak
    // Agar Ngrok ishlatilmayotgan bo'lsa, bu qatorni comment qiling
    // hmr: {
    //   clientPort: 443 // For ngrok HTTPS
    // },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL?.replace('/api', '') || 'https://zakaz-backend.railway.app',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  preview: {
    port: 5174,
  }
})
