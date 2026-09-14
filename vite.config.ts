import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The WebGL renderer is isolated in its own lazy-loaded chunk.
    chunkSizeWarningLimit: 600,
  },
})
