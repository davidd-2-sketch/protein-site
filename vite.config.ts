import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite settings. Docs: https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 3D libraries (Three.js, Mol*) are naturally large. They're loaded on demand,
    // only when a 3D view appears, so a bigger file here is expected and fine.
    chunkSizeWarningLimit: 4000,
  },
})
