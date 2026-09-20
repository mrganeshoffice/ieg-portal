import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, LogOut, Maximize2, Menu, Minimize2, Moon, Search, Settings, Sun } from 'lucide-react';
import { findNav } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const { pathname } = useLocation();
  const item = findNav(pathname);
  const { session, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [fs, setFs] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    const f = () => setFs(!!document.fullscreenElement);
    document.addEventListener('mousedown', h); document.addEventListener('fullscreenchange', f);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('fullscreenchange', f); };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onSearch(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onSearch]);

  const initials = (session?.name ?? 'IEG').split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-xl md:gap-3 md:px-6">
      <button className="icon-btn" onClick={onMenu} aria-label="Toggle menu"><Menu size={20} /></button>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold leading-tight md:text-base">{item?.label ?? 'Not found'}</h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.nav key={pathname} aria-label="Breadcrumb" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <Link to="/" className="hover:text-ink">Home</Link>
            {item && item.path !== '/' && <><ChevronRight size={12} /><span>{item.section}</span><ChevronRight size={12} /><span className="font-semibold text-ink">{item.label}</span></>}
          </motion.nav>
        </AnimatePresence>
      </div>

      <button onClick={onSearch} className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-line bg-app px-3 text-sm text-muted transition hover:border-brand/50 lg:flex" aria-label="Search">
        <Search size={16} /><span className="flex-1 truncate text-left">Search</span><kbd className="rounded-md border border-line px-1.5 text-[10px]">Ctrl K</kbd>
      </button>
      <button onClick={onSearch} className="icon-btn lg:hidden" aria-label="Search"><Search size={20} /></button>
      <button className="icon-btn hidden md:inline-flex" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())} aria-label="Toggle fullscreen">{fs ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</button>
      <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>

      <div className="relative" ref={ref}>
        <button onClick={() => setMenu(!menu)} className="flex h-10 items-center gap-2 rounded-xl pl-1 pr-2 transition hover:bg-app" aria-haspopup="menu" aria-expanded={menu}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-leaf text-xs font-extrabold text-white">{initials}</span>
        </button>
        <AnimatePresence>
          {menu && (
            <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="card absolute right-0 top-12 w-60 p-2">
              <div className="px-3 py-2"><p className="text-sm font-bold">{session?.name}</p><p className="truncate text-xs text-muted">{session?.email}</p></div>
              <div className="my-1 h-px bg-line" />
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-app" onClick={() => nav('/settings')}><Settings size={16} />Settings</button>
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-500/10" onClick={() => { logout(); nav('/login'); }}><LogOut size={16} />Logout</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
