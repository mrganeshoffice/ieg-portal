/** HMAC-signed httpOnly-cookie sessions, shared by the admin core and the EMS module. */
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (s) => Buffer.from(s).toString('base64url');

export function makeSessions(getSecret) {
  async function sign(payload) {
    const body = b64(JSON.stringify(payload));
    return `${body}.${createHmac('sha256', await getSecret()).update(body).digest('base64url')}`;
  }
  async function verify(token) {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const good = createHmac('sha256', await getSecret()).update(body).digest('base64url');
    const x = Buffer.from(sig), y = Buffer.from(good);
    if (x.length !== y.length || !timingSafeEqual(x, y)) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
  }
  return { sign, verify };
}

export const parseCookies = (h) => Object.fromEntries(String(h || '').split(';').map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k));
