import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Allow external access when using ngrok
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'a067-2a09-bac5-d45f-263c-00-3cf-21.ngrok-free.app'
    ]
  }
})
