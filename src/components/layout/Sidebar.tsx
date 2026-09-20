import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navItems } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';

export default function Sidebar({ collapsed, onToggle, onNavigate, mobile }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void; mobile?: boolean }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const sections = [...new Set(navItems.map((n) => n.section))];
  const slim = collapsed && !mobile;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-navy-900 text-slate-300">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Logo size={38} />
        {!slim && <div className="min-w-0 leading-tight"><p className="truncate text-sm font-extrabold text-white">IEG Group</p><p className="truncate text-[11px] text-slate-400">Organization Portal</p></div>}
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        {sections.map((s) => (
          <div key={s} className="mb-4">
            {!slim && <p className="mb-1.5 px-3 text-xs font-semibold text-slate-500">{s}</p>}
            {slim && <div className="mx-3 mb-2 h-px bg-white/10" />}
            <ul className="space-y-0.5">
              {navItems.filter((n) => n.section === s).map((n) => {
                const Icon = n.icon;
                const base = `relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${slim ? 'justify-center' : ''}`;
                if (n.action === 'logout') {
                  return (
                    <li key={n.id}>
                      <button className={`${base} w-full text-slate-400 hover:bg-red-500/10 hover:text-red-300`} title={n.label} onClick={() => { logout(); nav('/login'); }}>
                        <Icon size={18} className="shrink-0" />{!slim && <span>{n.label}</span>}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={n.id}>
                    <NavLink to={n.path} end onClick={onNavigate} title={n.label} className={({ isActive }) => `${base} ${isActive ? 'text-white' : 'hover:bg-white/5 hover:text-white'}`}>
                      {({ isActive }) => (<>
                        {isActive && <motion.span layoutId={mobile ? 'pill-m' : 'pill'} className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand/30 to-leaf/15 ring-1 ring-brand/40" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                        <Icon size={18} className={`relative shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                        {!slim && <span className="relative truncate">{n.label}</span>}
                      </>)}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!mobile && (
        <button onClick={onToggle} className="relative m-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} />Collapse</>}
        </button>
      )}
    </div>
  );
}
