import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['receipt-logo.jpeg'],
      manifest: {
        name: 'Dimsum Dimsay POS',
        short_name: 'Dimsay POS',
        description: 'Aplikasi Kasir Dimsum Dimsay',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#dc2626',
        icons: [
          {
            src: '/receipt-logo.jpeg',
            sizes: 'any',
            type: 'image/jpeg',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-network-only',
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
