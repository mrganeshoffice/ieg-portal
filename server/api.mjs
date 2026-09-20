/**
 * Local / self-hosted server adapter. Zero dependencies (Node 18+).
 * Stores presentations in server/data/presentations.json and thumbnails in server/data/uploads/.
 * Admin accounts live in server/data/admin.json as salted scrypt hashes (create with `npm run admin:create`).
 */
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, MAX_BODY, createCore, hashPassword } from './core.mjs';

export { hashPassword };
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.IEG_DATA_DIR || path.join(HERE, 'data');
const UPLOADS = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'presentations.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const KEY_FILE = path.join(DATA_DIR, 'session.key');

export async function readAdmins() {
  try { const a = JSON.parse(await readFile(ADMIN_FILE, 'utf8')); return Array.isArray(a) ? a : []; } catch { return []; }
}
export async function saveAdmins(list) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(ADMIN_FILE, JSON.stringify(list, null, 2), { mode: 0o600 });
}

let secretKey = null;
async function fileSecret() {
  if (secretKey) return secretKey;
  try { secretKey = (await readFile(KEY_FILE, 'utf8')).trim(); }
  catch { secretKey = randomBytes(32).toString('hex'); await mkdir(DATA_DIR, { recursive: true }); await writeFile(KEY_FILE, secretKey, { mode: 0o600 }); }
  return secretKey;
}

let queue = Promise.resolve();
const locked = (fn) => { const run = queue.then(fn); queue = run.catch(() => {}); return run; };
async function readDb() { try { const d = JSON.parse(await readFile(DB_FILE, 'utf8')); return Array.isArray(d) ? d : []; } catch { return []; } }
async function writeDb(rows) { const tmp = `${DB_FILE}.${process.pid}.tmp`; await writeFile(tmp, JSON.stringify(rows, null, 2)); await rename(tmp, DB_FILE); }

const fileStorage = {
  list: () => readDb(),
  get: async (id) => (await readDb()).find((r) => r.id === id) ?? null,
  put: (row) => locked(async () => { const rows = await readDb(); const i = rows.findIndex((r) => r.id === row.id); if (i === -1) rows.push(row); else rows[i] = row; await writeDb(rows); }),
  remove: (id) => locked(async () => { await writeDb((await readDb()).filter((r) => r.id !== id)); }),
  putImage: (name, buf) => writeFile(path.join(UPLOADS, name), buf),
  getImage: (name) => readFile(path.join(UPLOADS, name)).catch(() => null),
  removeImage: (name) => unlink(path.join(UPLOADS, name)).catch(() => {}),
};

/* live updates (Server-Sent Events) */
const clients = new Set();
const broadcast = () => { for (const r of clients) r.write('event: changed\ndata: {}\n\n'); };
setInterval(() => { for (const r of clients) r.write(': ping\n\n'); }, 25000).unref();

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'That request is too large.')); req.resume(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function createApiHandler() {
  await mkdir(UPLOADS, { recursive: true });
  const core = createCore({ storage: fileStorage, getAdmins: readAdmins, getSecret: fileSecret, onChange: broadcast });

  return async function handler(req, res, next) {
    let url;
    try { url = new URL(req.url, 'http://local'); } catch { return next(); }
    const p = url.pathname;
    if (!p.startsWith('/api/') && !p.startsWith('/uploads/')) return next();

    if (req.method === 'GET' && p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    let out;
    try {
      const body = req.method === 'GET' || req.method === 'HEAD' ? null : await readBody(req, MAX_BODY);
      out = await core({ method: req.method, pathname: p, headers: req.headers, body, ip: req.socket.remoteAddress || 'unknown', https: !!req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https', host: req.headers.host });
    } catch (e) {
      out = { status: e instanceof HttpError ? e.status : 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e instanceof HttpError ? e.message : 'Something went wrong on the server.' }) };
    }
    res.writeHead(out.status, out.headers);
    res.end(req.method === 'HEAD' ? undefined : out.body);
  };
}
