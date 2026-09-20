import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAdminSession, onAdminSignedOut, signInAdmin, signOutAdmin, type AdminSignInResult } from '@/services/adminAuthService';
import type { AdminUser } from '@/types/productPresentation';

interface Ctx {
  status: 'loading' | 'authed' | 'anon';
  admin: AdminUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<AdminSignInResult>;
  logout: () => Promise<void>;
}
const AdminCtx = createContext<Ctx | null>(null);

/** Separate from the portal's AuthContext on purpose: admin access never shares state with the demo user login. */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Ctx['status']>('loading');
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    let live = true;
    getAdminSession().then((a) => { if (live) { setAdmin(a); setStatus(a ? 'authed' : 'anon'); } }).catch(() => { if (live) setStatus('anon'); });
    const off = onAdminSignedOut(() => { setAdmin(null); setStatus('anon'); });
    return () => { live = false; off(); };
  }, []);

  const login = useCallback(async (e: string, p: string, r: boolean) => {
    const res = await signInAdmin(e, p, r);
    if (res.ok) { setAdmin(res.admin); setStatus('authed'); }
    return res;
  }, []);
  const logout = useCallback(async () => { await signOutAdmin(); setAdmin(null); setStatus('anon'); }, []);
  const value = useMemo(() => ({ status, admin, login, logout }), [status, admin, login, logout]);
  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export const useAdminAuth = () => { const c = useContext(AdminCtx); if (!c) throw new Error('useAdminAuth outside AdminAuthProvider'); return c; };
