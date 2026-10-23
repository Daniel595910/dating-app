import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Dating App',
        short_name: 'DatingApp',
        description: 'Regional Community Dating Platform',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@dating-app/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@dating-app/types': path.resolve(__dirname, '../../packages/types/src'),
      '@dating-app/database': path.resolve(__dirname, '../../packages/database/src'),
      '@dating-app/validation': path.resolve(__dirname, '../../packages/validation/src'),
      '@dating-app/config': path.resolve(__dirname, '../../packages/config/src'),
      '@dating-app/utils': path.resolve(__dirname, '../../packages/utils/src')
    }
  },
  server: {

    port: 3000,
    host: true
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    outDir: 'dist'
  }
});


