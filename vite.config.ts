import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/**/*', 'favicon.ico'],
      manifest: {
        name: 'Alejandro Sanclemente',
        short_name: 'Alejandro',
        description: 'Interactive Media Designer based in Tuluá, Colombia. I specialize in motion design, UX design and web development.',
        theme_color: '#191919',
        background_color: '#191919',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/images/manifest/icon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
          },
          {
            src: '/images/manifest/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
          },
          {
            src: '/images/manifest/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: '/images/manifest/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
          },
          {
            src: '/images/manifest/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/manifest/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
