import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output directory for the build, resolved to the project root's 'dist' folder
    outDir: path.resolve(__dirname, './dist'),
    // Ensure the output directory is cleared before each build
    emptyOutDir: true,
  }
})
