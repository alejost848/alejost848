import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    // Ensure Lit (and other libraries) strip dev-mode checks in production builds
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'lit-vendor': ['lit', 'lit/decorators.js'],
          'gsap-vendor': ['gsap'],
          'firebase-core': ['firebase/app', 'firebase/auth', 'firebase/database'],
          'firebase-messaging': ['firebase/messaging'],
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'images/logo.svg',
        'images/manifest/icon-*.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
      },
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
