/** Production server: serves the built site (dist/) and the API on one port.  npm run build && npm start */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './api.mjs';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };

async function serveStatic(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  let rel; try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  let file = path.join(DIST, path.normalize(rel));
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  let st = await stat(file).catch(() => null);
  if (!st || st.isDirectory()) {
    if (path.extname(rel)) { res.writeHead(404); return res.end('Not found'); } // missing asset
    file = path.join(DIST, 'index.html'); st = await stat(file).catch(() => null); // SPA route
    if (!st) { res.writeHead(500); return res.end('Site not built yet. Run: npm run build'); }
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size,
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
  });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

const api = await createApiHandler();
http.createServer((req, res) => { api(req, res, () => serveStatic(req, res)).catch(() => { res.writeHead(500); res.end(); }); })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`\nIEG Portal running:\n  On this computer:  http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) console.log(`  On your network:   http://${i.address}:${PORT}`);
    console.log('\nAdmin sign-in: /admin/login   (create an admin first: npm run admin:create)\n');
  });
