import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    allowedHosts: ['intelli-study.art', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://101.34.227.122:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});