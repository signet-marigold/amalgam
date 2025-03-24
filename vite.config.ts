import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    cors: true,
    fs: {
      strict: false
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
        }
      }
    },
    commonjsOptions: {
      include: [/@ffmpeg\/ffmpeg/, /@ffmpeg\/core/]
    }
  },
  define: {
    'process.env': {},
    global: {}
  },
  resolve: {
    alias: {
      '@ffmpeg/ffmpeg': '@ffmpeg/ffmpeg/dist/esm/index.js',
      '@ffmpeg/core': '@ffmpeg/core/dist/ffmpeg-core.js'
    }
  },
  assetsInclude: ['**/*.wasm'],
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[tj]sx?$/,
    exclude: []
  },
  publicDir: 'public',
  clearScreen: false
})
