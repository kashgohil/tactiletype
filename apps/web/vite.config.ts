import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3020,
    // The API sits on the very next port, so Vite's default "try the next one"
    // behaviour would quietly serve the web app from the API's port. Fail instead.
    strictPort: true,
    proxy: {
      '/api': { changeOrigin: true, target: 'http://localhost:3021' },
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
