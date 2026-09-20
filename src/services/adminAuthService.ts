import { ADMIN_UNAUTHORIZED, ApiError, api } from '@/lib/api';
import type { AdminUser } from '@/types/productPresentation';

export type AdminSignInResult = { ok: true; admin: AdminUser } | { ok: false; error: string };

export async function signInAdmin(email: string, password: string, remember: boolean): Promise<AdminSignInResult> {
  try {
    const r = await api<{ email: string }>('/api/admin/login', { method: 'POST', body: { email: email.trim(), password, remember } });
    return { ok: true, admin: { id: r.email, email: r.email } };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Something went wrong. Please try again.' };
  }
}

/** The admin session lives in an httpOnly cookie; the server tells us who (if anyone) is signed in. */
export async function getAdminSession(): Promise<AdminUser | null> {
  try { const r = await api<{ email: string }>('/api/admin/me'); return { id: r.email, email: r.email }; }
  catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
}

export async function signOutAdmin(): Promise<void> {
  try { await api('/api/admin/logout', { method: 'POST', body: {} }); } catch { /* the local sign-out still proceeds */ }
}

/** True once at least one admin account exists on the server. */
export async function isAdminConfigured(): Promise<boolean | null> {
  try { return (await api<{ adminConfigured: boolean }>('/api/admin/status')).adminConfigured; } catch { return null; }
}

/** Fires when the server says the session has ended (expired, or removed). */
export function onAdminSignedOut(cb: () => void): () => void {
  window.addEventListener(ADMIN_UNAUTHORIZED, cb);
  return () => window.removeEventListener(ADMIN_UNAUTHORIZED, cb);
}
