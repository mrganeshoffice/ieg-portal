/**
 * Client-side demo authentication. INTERNAL PROTOTYPE ONLY.
 * Everything auth-related lives in this file so it can be replaced by a real backend call
 * (e.g. POST /api/auth/login returning a token) without touching the UI.
 */
const STORAGE_KEY = 'ieg.portal.session';
const DEMO_USER = { email: 'ieg@ieg.com', password: 'ieg@2026', name: 'IEG Admin' };

export interface Session { email: string; name: string; issuedAt: number; expiresAt: number }
export type AuthResult = { ok: true; session: Session } | { ok: false; error: string };

const DAY = 24 * 60 * 60 * 1000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function authenticate(email: string, password: string, remember: boolean): Promise<AuthResult> {
  await wait(1100); // simulates network latency
  if (email.trim().toLowerCase() !== DEMO_USER.email || password !== DEMO_USER.password) {
    return { ok: false, error: 'Incorrect email or password. Check your details and try again.' };
  }
  const now = Date.now();
  const session: Session = { email: DEMO_USER.email, name: DEMO_USER.name, issuedAt: now, expiresAt: now + (remember ? 30 * DAY : DAY) };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* storage unavailable */ }
  return { ok: true, session };
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s?.email || s.expiresAt < Date.now()) { localStorage.removeItem(STORAGE_KEY); return null; }
    return s;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
