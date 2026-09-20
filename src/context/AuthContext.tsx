import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { authenticate, clearSession, loadSession, type AuthResult, type Session } from '@/services/auth';

interface AuthCtx {
  session: Session | null;
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const login = useCallback(async (e: string, p: string, r: boolean) => {
    const res = await authenticate(e, p, r);
    if (res.ok) setSession(res.session);
    return res;
  }, []);
  const logout = useCallback(() => { clearSession(); setSession(null); }, []);
  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c; };
