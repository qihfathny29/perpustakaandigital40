import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https: false, // Disable HTTPS untuk ngrok compatibility
    allowedHosts: [
      'localhost',
      '172.22.7.80',
      'b6023f6387ea.ngrok-free.app', // Allow ngrok host
      '.ngrok-free.app', // Allow all ngrok-free.app subdomains
      '.ngrok.io' // Allow all ngrok.io subdomains
    ],
    proxy: {
      '/api': {
        target: 'http://172.22.7.80:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  css: {
    postcss: './postcss.config.cjs',
  },
});