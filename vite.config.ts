import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const urlObj = new URL(req.url, 'http://localhost');
        const routeName = urlObj.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
        const filePath = path.resolve(process.cwd(), 'api', `${routeName}.js`);

        if (!fs.existsSync(filePath)) {
          return next();
        }

        try {
          let body: any = {};
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
            const chunks: any[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const raw = Buffer.concat(chunks).toString('utf-8');
            if (raw) {
              try {
                body = JSON.parse(raw);
              } catch {
                body = raw;
              }
            }
          }
          (req as any).body = body;
          (req as any).query = Object.fromEntries(urlObj.searchParams.entries());

          (res as any).status = function (code: number) {
            res.statusCode = code;
            return res;
          };
          (res as any).json = function (data: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          const fileUrl = pathToFileURL(filePath).href;
          const mod = await import(`${fileUrl}?t=${Date.now()}`);
          if (mod.default) {
            await mod.default(req, res);
          } else {
            next();
          }
        } catch (err: any) {
          console.error('API Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }): Promise<any> => {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {}
  }

  const plugins = [react(), tailwindcss(), apiDevPlugin()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  const defaultEnv: Record<string, string> = {
    VITE_SUPABASE_URL: 'https://tnbhkfqaxbfmohtsssny.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'sb_publishable_3FD7CCySQFIUM-D3CHX0nA_If6yOL98',
    NEXT_PUBLIC_SUPABASE_URL: 'https://tnbhkfqaxbfmohtsssny.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_3FD7CCySQFIUM-D3CHX0nA_If6yOL98',
    VITE_GOOGLE_CLIENT_ID: '1065078894672-rmp5kp8vfjns5rn9kp5psfp16g691043.apps.googleusercontent.com',
    VITE_GOOGLE_AUTH_PROXY: 'https://designarena.ai/auth/google/callback',
  };

  const loaded = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const env = { ...defaultEnv, ...loaded };
  Object.assign(process.env, env);

  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    server: {
      host: true,
      allowedHosts: true,
      watch: {
        ignored: [
          '**/data/**',
          '**/dist/**',
          '**/public/uploads/**',
          '**/.git/**',
          '**/scratch/**',
        ],
      },
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }
              if (id.includes('lucide-react')) {
                return 'lucide-icons';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
})



