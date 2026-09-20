import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
// @ts-expect-error plain ESM module without types
import { createApiHandler } from './server/api.mjs';

/** Runs the local API (presentations + admin login) inside the dev and preview servers. */
function iegApi(): Plugin {
  const mount = async (server: { middlewares: { use: (fn: (req: never, res: never, next: () => void) => void) => void } }) => {
    const handler = await createApiHandler();
    server.middlewares.use((req, res, next) => { void handler(req, res, next); });
  };
  return { name: 'ieg-api', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig({
  plugins: [react(), iegApi()],
  server: { watch: { ignored: ['**/server/data/**'] } },
  build: { rollupOptions: { output: { manualChunks: { flow: ['@xyflow/react'], motion: ['framer-motion'], react: ['react','react-dom','react-router-dom'] } } } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
