import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SearchPalette from '@/components/ui/SearchPalette';
import { findNav } from '@/config/navigation';
import { pushRecent } from '@/lib/recent';

export default function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ieg.sidebar') === '1');
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => { localStorage.setItem('ieg.sidebar', collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { setDrawer(false); window.scrollTo(0, 0); const n = findNav(pathname); if (n && n.path !== '/' && n.path !== '/settings') pushRecent(pathname); }, [pathname]);

  const onMenu = () => (window.matchMedia('(min-width: 768px)').matches ? setCollapsed((c) => !c) : setDrawer(true));

  return (
    <div className="flex min-h-full">
      <aside className={`no-print sticky top-0 hidden h-screen shrink-0 transition-[width] duration-300 md:block ${collapsed ? 'w-[76px]' : 'w-72'}`}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="no-print fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="no-print fixed inset-y-0 left-0 z-50 w-72 md:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <Sidebar collapsed={false} mobile onToggle={() => setDrawer(false)} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={onMenu} onSearch={() => setSearch(true)} />
        <main className="flex-1 p-4 md:p-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
