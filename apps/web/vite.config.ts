import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3002,
    proxy: {
      '/api': { changeOrigin: true, target: 'http://localhost:8002' },
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
