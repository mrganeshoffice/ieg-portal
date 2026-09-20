/** Tiny fetch wrapper for the portal's local API. Cookies (admin session) are httpOnly and never touched by JS. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export const ADMIN_UNAUTHORIZED = 'ieg:admin-unauthorized';

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? 'GET', credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that it is running and try again.');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
    if (res.status === 401 && path.startsWith('/api/admin/') && path !== '/api/admin/login' && path !== '/api/admin/me') window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED));
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
