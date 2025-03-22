import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/vision': {
        target: 'http://50.19.151.86:5001',
        changeOrigin: true,
        secure: false,
      },
      '/calculate': {
        target: 'http://50.19.151.86:5001',
        changeOrigin: true,
        secure: false,
      },
      '/solve-steps': {
        target: 'http://50.19.151.86:5001',
        changeOrigin: true,
        secure: false,
      },
    }
  }
});
