/// <reference types="vitest/config" />
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { APP_NAME, APP_SHORT_NAME } from './shared/brand';

const MAX_DEV_BODY = 64 * 1024;

const DEV_API_ROUTES = ['generate', 'room'];

/** Serves the api/*.ts functions during `npm run dev`, so local work doesn't need `vercel dev`. */
function devApi(): Plugin {
  return {
    name: 'qa-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const route of DEV_API_ROUTES) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          let size = 0;
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > MAX_DEV_BODY) {
              res.statusCode = 413;
              return res.end();
            }
            chunks.push(chunk);
          }
          const body = Buffer.concat(chunks).toString('utf8');

          const { default: handler } = await server.ssrLoadModule(`/api/${route}.ts`);
          const shim = {
            status(code: number) {
              res.statusCode = code;
              return shim;
            },
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            json(payload: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };
          try {
            await handler({ method: req.method, headers: req.headers, body: body || undefined }, shim);
          } catch (error) {
            server.config.logger.error(String(error));
            if (!res.writableEnded) shim.status(500).json({ error: 'failed', message: 'Dev handler crashed.' });
          }
        });
      }
    },
  };
}

/** Mirror production security headers from vercel.json in `vite preview`. */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'vercel.json'), 'utf8'));
  const global = config.headers.find((h: { source: string }) => h.source === '/(.*)');
  return Object.fromEntries(
    global.headers
      .filter((h: { key: string }) => h.key !== 'Strict-Transport-Security')
      .map((h: { key: string; value: string }) => [h.key, h.value]),
  );
}

export default defineConfig(({ mode }) => {
  // Expose server-only settings from .env.local to the dev API handler. Nothing
  // here is passed to `define`, so secrets never reach the client bundle.
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of [
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_FALLBACK_MODEL',
    'GEMINI_THINKING_LEVEL',
    'ALLOWED_ORIGINS',
    'DAILY_AI_LIMIT',
    'PER_IP_DAILY_AI_LIMIT',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
  ]) {
    if (env[key] !== undefined && process.env[key] === undefined) process.env[key] = env[key];
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 4173,
      headers: productionHeaders(),
    },
    plugins: [
      devApi(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'theme-init.js'],
        manifest: {
          id: '/',
          name: APP_NAME,
          short_name: APP_SHORT_NAME,
          description: 'Conversation-starter questions for couples. Date nights, walks and long drives.',
          start_url: '/',
          scope: '/',
          theme_color: '#f43f5e',
          background_color: '#fff1f2',
          display: 'standalone',
          orientation: 'portrait',
          categories: ['lifestyle', 'entertainment', 'social'],
          icons: [
            { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Precache the app shell and the Latin font subsets; other scripts load on demand.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}', '**/*-latin-wght-*.woff2'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'font',
              handler: 'CacheFirst',
              options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    test: {
      include: ['tests/**/*.test.ts'],
    },
  };
});
