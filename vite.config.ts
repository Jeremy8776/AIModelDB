import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/aa-api': {
        target: 'https://artificialanalysis.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/aa-api/, '/api'),
      },
      '/modelscope-api': {
        target: 'https://modelscope.cn',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/modelscope-api/, ''),
      },

      '/huggingface-api': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/huggingface-api/, '/api'),
      },
      '/huggingface-web': {
        target: 'https://huggingface.co',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/huggingface-web/, ''),
      },
      '/openai-api': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/openai-api/, '/v1'),
      },
      '/anthropic-api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/anthropic-api/, ''),
      },
      '/cohere-api': {
        target: 'https://api.cohere.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/cohere-api/, ''),
      },
      '/google-api': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/google-api/, ''),
      },
      '/deepseek-api': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/deepseek-api/, ''),
      },
      '/perplexity-api': {
        target: 'https://api.perplexity.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/perplexity-api/, ''),
      },
      '/openrouter-api': {
        target: 'https://openrouter.ai/api',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/openrouter-api/, ''),
      },
      '/together-api': {
        target: 'https://api.together.xyz',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/together-api/, ''),
      },
      '/stability-api': {
        target: 'https://api.stability.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/stability-api/, ''),
      },
      '/groq-api': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/groq-api/, ''),
      },
      '/mistral-api': {
        target: 'https://api.mistral.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/mistral-api/, ''),
      },
      '/fireworks-api': {
        target: 'https://api.fireworks.ai',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/fireworks-api/, ''),
      },
      '/ai21-api': {
        target: 'https://api.ai21.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/ai21-api/, ''),
      },

      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/github-api/, ''),
      },
      '/civitai-api': {
        target: 'https://civitai.com',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/civitai-api/, '/api/v1'),
      },

    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild for faster minification (faster than terser)
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false, // Disable gzip size reporting to speed up build
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies into separate chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react'],
        },
      },
    },
  },
})
