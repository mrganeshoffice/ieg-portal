/** Portal sign-in against the server (/api/auth/*). The session is an httpOnly cookie; nothing secret is kept in the browser. */
import { ApiError, api } from '@/lib/api';

export type Role = 'super_admin' | 'admin' | 'manager' | 'employee';
export interface Session { id: number; email: string; name: string; role: Role; employeeId: number | null; mustChangePassword: boolean; fullAccess: boolean }
export type AuthResult = { ok: true; session: Session } | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof ApiError ? e.message : 'Something went wrong. Please try again.' });

export async function authenticate(email: string, password: string, remember: boolean): Promise<AuthResult> {
  try { return { ok: true, session: await api<Session>('/api/auth/login', { method: 'POST', body: { email: email.trim(), password, remember } }) }; } catch (e) { return fail(e); }
}
/** The signed-in user, or null when nobody is signed in. */
export async function loadSession(): Promise<Session | null> {
  try { return await api<Session>('/api/auth/me'); } catch (e) { if (e instanceof ApiError && (e.status === 401 || e.status === 503 || e.status === 404)) return null; throw e; }
}
export async function clearSession(): Promise<void> {
  try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* the local sign-out still proceeds */ }
}
export async function changePassword(current: string, password: string): Promise<AuthResult> {
  try { return { ok: true, session: await api<Session>('/api/auth/change-password', { method: 'POST', body: { current, password } }) }; } catch (e) { return fail(e); }
}
export async function getSetupInfo(token: string): Promise<{ email: string; name: string | null } | { error: string }> {
  try { return await api<{ email: string; name: string | null }>(`/api/auth/setup-info?token=${encodeURIComponent(token)}`); } catch (e) { return { error: e instanceof ApiError ? e.message : 'Could not check this link.' }; }
}
export async function setupPassword(token: string, password: string): Promise<AuthResult> {
  try { return { ok: true, session: await api<Session>('/api/auth/setup-password', { method: 'POST', body: { token, password } }) }; } catch (e) { return fail(e); }
}
export const isAdminRole = (r?: Role | null) => r === 'admin' || r === 'super_admin';
