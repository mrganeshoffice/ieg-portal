import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import Logo from '@/components/ui/Logo';
import NotificationBell from '@/components/layout/NotificationBell';
import { ADMIN_NAV, type AdminTabKey } from './AdminTabs';

function Nav({ active, onPick }: { active: AdminTabKey; onPick?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {ADMIN_NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = it.key === active;
              return (
                <li key={it.key}>
                  <Link to={it.to} onClick={onPick} aria-current={on ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on ? 'bg-gradient-to-r from-brand/25 to-leaf/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                    {on && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-brand" />}
                    <it.icon size={18} className={on ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'} />{it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/admin/home" className="flex items-center gap-3 px-5 py-5" aria-label="Admin dashboard">
      <Logo size={40} /><div className="leading-tight"><p className="text-sm font-extrabold text-white">IEG Admin</p><p className="text-[11px] text-slate-400">Workforce portal</p></div>
    </Link>
  );
}

/** Left navigation (fixed on desktop, a drawer on mobile) plus the slim top bar. Pages add the `admin-page` class to their root. */
export default function AdminHeader({ active, subtitle }: { active: AdminTabKey; subtitle: string }) {
  const { admin, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  const initial = (admin?.email ?? 'A').charAt(0).toUpperCase();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-900 lg:flex" aria-label="Sidebar">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand/15 to-transparent" />
        <Brand />
        <Nav active={active} />
        <div className="border-t border-white/10 p-3">
          <a href="/" className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white"><ExternalLink size={14} />Open company portal</a>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-leaf text-sm font-extrabold text-white">{initial}</span>
            <p className="min-w-0 flex-1 truncate text-xs text-slate-300">{admin?.email}</p>
            <button type="button" onClick={() => void logout()} aria-label="Sign out" title="Sign out" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur md:px-8">
        <button type="button" className="icon-btn lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{subtitle}</p>
        <NotificationBell adminMode />
        <span className="hidden max-w-[16rem] truncate text-xs text-muted md:block">{admin?.email}</span>
        <button type="button" onClick={() => void logout()} className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-xl border border-line px-3 text-sm font-semibold hover:bg-app lg:hidden" aria-label="Sign out"><LogOut size={15} /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-900 shadow-2xl">
            <button type="button" className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
            <Brand /><Nav active={active} onPick={() => setOpen(false)} />
            <div className="border-t border-white/10 p-3"><button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"><LogOut size={16} />Sign out</button></div>
          </div>
        </div>
      )}
    </>
  );
}
