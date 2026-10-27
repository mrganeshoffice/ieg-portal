import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import Logo from '@/components/ui/Logo';
import AdminTabs, { type AdminTabKey } from './AdminTabs';

export default function AdminHeader({ active, subtitle }: { active: AdminTabKey; subtitle: string }) {
  const { admin, logout } = useAdminAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900 text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
        <Link to="/" aria-label="Back to the portal"><Logo size={38} /></Link>
        <div className="hidden min-w-0 flex-1 leading-tight sm:block"><p className="truncate text-sm font-extrabold">Admin Portal</p><p className="truncate text-[11px] text-slate-400">{subtitle}</p></div>
        <div className="min-w-0 flex-1 sm:flex-none"><AdminTabs active={active} /></div>
        <span className="hidden max-w-[14rem] truncate text-xs text-slate-300 lg:block">{admin?.email}</span>
        <button type="button" onClick={() => void logout()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label="Sign out"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
      </div>
    </header>
  );
}
