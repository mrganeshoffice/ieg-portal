/**
 * Shared API logic (no Node http, no file system). Used by:
 *   - server/api.mjs      : local dev / self-hosted server (files on disk)
 *   - server/netlify.mjs  : Netlify Function (Netlify Blobs)
 * A "storage" adapter provides: list, get, put, remove, putImage, getImage, removeImage.
 */
import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (m) => { throw new HttpError(400, m); };

export const COOKIE = 'ieg_admin';
export const MAX_IMAGE = 4 * 1024 * 1024; // 4 MB (keeps the upload under Netlify's 6 MB request limit once base64-encoded)
export const MAX_BODY = 8 * 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;
export const FILE_RE = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const byOrder = (a, b) => a.display_order - b.display_order || +new Date(b.created_at) - +new Date(a.created_at);

function validUrl(u) {
  if (!u || u.length > 2000 || /\s/.test(u)) return false;
  if (u.startsWith('/')) return !u.startsWith('//') && !u.startsWith('/\\');
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; }
}
function clean(body, partial) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Invalid request.');
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const out = {};
  if (!partial || has('title')) { const t = typeof body.title === 'string' ? body.title.trim() : ''; if (!t || t.length > 120) bad('Title must be 1 to 120 characters.'); out.title = t; }
  if (!partial || has('description')) { const d = body.description == null ? '' : typeof body.description === 'string' ? body.description.trim() : bad('Invalid description.'); if (d.length > 500) bad('Description must be 500 characters or fewer.'); out.description = d || null; }
  if (!partial || has('presentation_url')) { const u = typeof body.presentation_url === 'string' ? body.presentation_url.trim() : ''; if (!validUrl(u)) bad('Enter a valid link starting with https:// (or a portal path such as /org-chart).'); out.presentation_url = u; }
  if (!partial || has('thumbnail_url')) { const t = typeof body.thumbnail_url === 'string' ? body.thumbnail_url : ''; if (!t.startsWith('/uploads/') || !FILE_RE.test(t.slice(9))) bad('Upload a valid thumbnail image.'); out.thumbnail_url = t; }
  if (has('display_order')) { const n = Number(body.display_order); if (!Number.isInteger(n) || n < 0 || n > 999999) bad('Display order must be a whole number from 0 to 999999.'); out.display_order = n; }
  if (has('is_published')) { if (typeof body.is_published !== 'boolean') bad('Invalid status.'); out.is_published = body.is_published; }
  return out;
}
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export function createCore({ storage, getAdmins, getSecret, onChange = () => {} }) {
  /* ---- sessions: HMAC-signed httpOnly cookie ---- */
  async function sign(payload) { const body = b64(JSON.stringify(payload)); return `${body}.${createHmac('sha256', await getSecret()).update(body).digest('base64url')}`; }
  async function verify(token) {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const good = createHmac('sha256', await getSecret()).update(body).digest('base64url');
    const x = Buffer.from(sig), y = Buffer.from(good);
    if (x.length !== y.length || !timingSafeEqual(x, y)) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
  }
  const parseCookies = (h) => Object.fromEntries(String(h || '').split(';').map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k));
  async function currentAdmin(r) {
    const p = await verify(parseCookies(r.headers.cookie)[COOKIE]);
    if (!p) return null;
    return (await getAdmins()).some((a) => a.email === p.email) ? { email: p.email } : null; // removed admins lose access at once
  }
  async function checkLogin(email, password) {
    const admin = (await getAdmins()).find((a) => a.email === email.trim().toLowerCase());
    const { hash } = await hashPassword(password, admin?.salt); // always hash, so timing does not reveal valid emails
    if (!admin) return null;
    const a = Buffer.from(hash, 'hex'), b = Buffer.from(admin.hash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b) ? admin : null;
  }

  /* ---- login throttling (per server instance) ---- */
  const fails = new Map();
  const WINDOW = 10 * 60 * 1000, MAX_FAILS = 8;
  const throttled = (ip) => { const f = fails.get(ip); if (!f) return false; if (Date.now() - f.first > WINDOW) { fails.delete(ip); return false; } return f.count >= MAX_FAILS; };
  const noteFail = (ip) => { const f = fails.get(ip); if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { count: 1, first: Date.now() }); else f.count++; };

  const json = (status, obj, headers = {}) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }, body: JSON.stringify(obj) });
  function readJson(r, limit = 64 * 1024) {
    if (!String(r.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send JSON.');
    const raw = r.body ?? Buffer.alloc(0);
    if (raw.length > limit) throw new HttpError(413, 'That request is too large.');
    try { return raw.length ? JSON.parse(raw.toString('utf8')) : {}; } catch { throw new HttpError(400, 'Invalid JSON.'); }
  }
  const inUse = async (url, exceptId) => (await storage.list()).some((x) => x.id !== exceptId && x.thumbnail_url === url);
  const removeUpload = async (url) => { const f = String(url || '').replace(/^\/uploads\//, ''); if (FILE_RE.test(f)) await storage.removeImage(f); };

  async function serveUpload(r) {
    const f = r.pathname.slice('/uploads/'.length);
    if (!FILE_RE.test(f) || !['GET', 'HEAD'].includes(r.method)) return json(404, { error: 'Not found.' });
    const buf = await storage.getImage(f);
    if (!buf) return json(404, { error: 'Not found.' });
    return { status: 200, headers: { 'Content-Type': MIME[f.split('.').pop()], 'Content-Length': String(buf.length), 'Cache-Control': 'public, max-age=31536000, immutable', 'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'" }, body: buf };
  }

  async function route(r) {
    const p = r.pathname, m = r.method;
    if (p.startsWith('/uploads/')) return serveUpload(r);

    if (m !== 'GET' && m !== 'HEAD') { // basic CSRF defence on top of SameSite cookies
      const origin = r.headers.origin;
      let host = null; try { host = origin ? new URL(origin).host : null; } catch { throw new HttpError(403, 'Cross-site request blocked.'); }
      if (host && host !== r.host && host !== r.headers.host) throw new HttpError(403, 'Cross-site request blocked.');
    }

    if (m === 'GET' && p === '/api/presentations') return json(200, (await storage.list()).filter((x) => x.is_published).sort(byOrder).map((x) => ({ ...x, created_by: null })));
    if (m === 'GET' && p === '/api/admin/status') return json(200, { adminConfigured: (await getAdmins()).length > 0 });

    if (m === 'POST' && p === '/api/admin/login') {
      if (throttled(r.ip)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
      const b = readJson(r);
      const admin = typeof b.email === 'string' && typeof b.password === 'string' && b.password.length <= 200 ? await checkLogin(b.email, b.password) : null;
      if (!admin) { noteFail(r.ip); throw new HttpError(401, 'Incorrect email or password. Check your details and try again.'); }
      fails.delete(r.ip);
      const remember = b.remember === true;
      const token = await sign({ email: admin.email, exp: Date.now() + (remember ? 30 * DAY : 12 * 60 * 60 * 1000) });
      return json(200, { email: admin.email }, { 'Set-Cookie': `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${remember ? `; Max-Age=${30 * 24 * 3600}` : ''}${r.https ? '; Secure' : ''}` });
    }
    if (m === 'POST' && p === '/api/admin/logout') return json(200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` });

    if (!p.startsWith('/api/admin/')) throw new HttpError(404, 'Not found.');
    const admin = await currentAdmin(r);
    if (!admin) throw new HttpError(401, 'Please sign in.');

    if (m === 'GET' && p === '/api/admin/me') return json(200, admin);
    if (m === 'GET' && p === '/api/admin/presentations') return json(200, (await storage.list()).sort(byOrder));

    if (m === 'POST' && p === '/api/admin/presentations') {
      const data = clean(readJson(r), false);
      const now = new Date().toISOString();
      const row = { id: randomUUID(), title: data.title, description: data.description, thumbnail_url: data.thumbnail_url, presentation_url: data.presentation_url, display_order: data.display_order ?? 0, is_published: data.is_published ?? true, created_at: now, updated_at: now, created_by: admin.email };
      await storage.put(row); onChange();
      return json(201, row);
    }

    if (m === 'PUT' && p === '/api/admin/presentations/order') {
      const b = readJson(r);
      if (!Array.isArray(b.order) || b.order.length > 500) bad('Invalid order.');
      const map = new Map(b.order.map((o) => [String(o?.id), Number(o?.display_order)]));
      for (const v of map.values()) if (!Number.isInteger(v) || v < 0 || v > 999999) bad('Invalid order.');
      const now = new Date().toISOString();
      await Promise.all([...map].map(async ([id, display_order]) => { const row = await storage.get(id); if (row) await storage.put({ ...row, display_order, updated_at: now }); }));
      onChange();
      return json(200, { ok: true });
    }

    const one = /^\/api\/admin\/presentations\/([0-9a-f-]{36})$/.exec(p);
    if (one && m === 'PATCH') {
      const data = clean(readJson(r), true);
      const row = await storage.get(one[1]);
      if (!row) throw new HttpError(404, 'That presentation no longer exists.');
      const old = row.thumbnail_url;
      const next = { ...row, ...data, updated_at: new Date().toISOString() };
      await storage.put(next);
      if (data.thumbnail_url && data.thumbnail_url !== old && !(await inUse(old, row.id))) await removeUpload(old); // replaced image
      onChange();
      return json(200, next);
    }
    if (one && m === 'DELETE') {
      const row = await storage.get(one[1]);
      if (!row) throw new HttpError(404, 'That presentation no longer exists.');
      await storage.remove(row.id);
      if (!(await inUse(row.thumbnail_url, row.id))) await removeUpload(row.thumbnail_url);
      onChange();
      return json(200, { ok: true });
    }

    if (m === 'POST' && p === '/api/admin/thumbnails') {
      const b = readJson(r, MAX_BODY);
      if (typeof b.data !== 'string') bad('No image received.');
      const buf = Buffer.from(b.data, 'base64');
      if (!buf.length) bad('This file is empty.');
      if (buf.length > MAX_IMAGE) bad('Image is too large. Maximum size is 4 MB.');
      const ext = sniff(buf); // trust the file's real bytes, not the name or claimed type
      if (!ext) bad('Use a JPG, JPEG, PNG or WebP image.');
      const name = `${randomUUID()}.${ext}`;
      await storage.putImage(name, buf);
      return json(201, { url: `/uploads/${name}`, path: name });
    }
    const th = /^\/api\/admin\/thumbnails\/([^/]+)$/.exec(p);
    if (th && m === 'DELETE') {
      let f; try { f = decodeURIComponent(th[1]); } catch { bad('Invalid file.'); }
      if (!FILE_RE.test(f)) bad('Invalid file.');
      if (!(await inUse(`/uploads/${f}`))) await storage.removeImage(f); // never delete an image a presentation still uses
      return json(200, { ok: true });
    }
    throw new HttpError(404, 'Not found.');
  }

  /** r = { method, pathname, headers (lower-case keys), body: Buffer|null, ip, https, host } -> { status, headers, body } */
  return async function handle(r) {
    try { return await route(r); }
    catch (e) {
      if (e instanceof HttpError) return json(e.status, { error: e.message });
      console.error('[ieg-api]', e); return json(500, { error: 'Something went wrong on the server.' });
    }
  };
}
