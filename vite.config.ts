import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiMiddleware } from './server/api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'traceai-api-proxy',
        configureServer(server) {
          // Register our API middleware BEFORE Vite's own middleware
          server.middlewares.use(createApiMiddleware(env));
        },
      },
    ],
    server: {
      proxy: {
        '/api/walrus-publisher': {
          target: 'https://publisher.walrus-testnet.walrus.space',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/walrus-publisher/, ''),
        },
        '/api/walrus-aggregator': {
          target: 'https://aggregator.walrus-testnet.walrus.space',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/walrus-aggregator/, ''),
        },
      },
    },
  };
})
