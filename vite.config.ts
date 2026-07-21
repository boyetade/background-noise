import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mediapipe/selfie_segmentation': path.resolve(
        __dirname,
        'src/mediapipe-stub.ts',
      ),
    },
  },
})
