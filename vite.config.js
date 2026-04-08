import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://aps-codepen.autodesk.io',
        changeOrigin: true,
        secure: true
      }
    }
  }
});
