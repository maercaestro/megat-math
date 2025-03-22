import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  server: command === 'serve' ? {
    proxy: {
      '/vision': {
        target: 'http://50.19.151.86:5001',
        changeOrigin: true,
        secure: false,
      },
      '/calculate': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
      '/solve-steps': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    }
  } : {}
}));
