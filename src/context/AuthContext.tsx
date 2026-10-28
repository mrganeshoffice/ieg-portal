import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authenticate, changePassword as changePw, clearSession, loadSession, setupPassword as setupPw, type AuthResult, type Session } from '@/services/auth';

interface AuthCtx {
  /** 'loading' only on first load, while the server is asked who is signed in. */
  status: 'loading' | 'authed' | 'anon';
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  changePassword: (current: string, password: string) => Promise<AuthResult>;
  setupPassword: (token: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /** Ask the server again who is signed in (used after signing in through the admin panel). */
  reload: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthCtx['status']>('loading');

  useEffect(() => {
    let live = true;
    loadSession().then((s) => { if (live) { setSession(s); setStatus(s ? 'authed' : 'anon'); } }).catch(() => { if (live) setStatus('anon'); });
    return () => { live = false; };
  }, []);

  const accept = useCallback((res: AuthResult) => { if (res.ok) { setSession(res.session); setStatus('authed'); } return res; }, []);
  const login = useCallback(async (e: string, p: string, r: boolean) => accept(await authenticate(e, p, r)), [accept]);
  const changePassword = useCallback(async (c: string, p: string) => accept(await changePw(c, p)), [accept]);
  const setupPassword = useCallback(async (t: string, p: string) => accept(await setupPw(t, p)), [accept]);
  const logout = useCallback(async () => { await clearSession(); setSession(null); setStatus('anon'); }, []);
  const reload = useCallback(async () => { try { const s = await loadSession(); setSession(s); setStatus(s ? 'authed' : 'anon'); } catch { setStatus('anon'); } }, []);
  const value = useMemo(() => ({ status, session, login, changePassword, setupPassword, logout, reload }), [status, session, login, changePassword, setupPassword, logout, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; };
