import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'rewrite-graddescent',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/graddescent' || req.url === '/graddescent/') {
            req.url = '/graddescent.html';
          }
          next();
        });
      }
    }
  ],
  base: '/digital-physics-lab/'
})

