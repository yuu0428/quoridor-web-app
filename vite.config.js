import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  // Vercel (and most hosts) serve from site root. GitHub Pages needs a repo subpath base.
  // Set VITE_BASE in the build environment if you want a non-root base.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
