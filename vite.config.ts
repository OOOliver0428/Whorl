import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Support PORT environment variable for proxy target
const serverPort = process.env.PORT || '3001'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${serverPort}`,
    },
  },
  build: {
    outDir: 'dist',
  },
})
