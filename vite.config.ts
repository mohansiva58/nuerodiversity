import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      // Workaround CORS during local development.
      // /__/call/getStreamChatToken is used by Firebase SDK via direct HTTPS callable protocol.
      '/__/': {
        target: 'https://us-central1-nuero-7deec.cloudfunctions.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});