import { useEffect, type ReactNode } from 'react';
import AdminHeader from './AdminHeader';
import type { AdminTabKey } from './AdminTabs';
import { useAuth } from '@/context/AuthContext';

/** Shows a work page (attendance, tasks, leave, reports, chat, policy) inside the admin panel's own header. */
export default function AdminWorkFrame({ tab, subtitle, children }: { tab: AdminTabKey; subtitle: string; children: ReactNode }) {
  const { status, reload } = useAuth();
  useEffect(() => { if (status === 'anon') void reload(); }, [status, reload]);
  return (
    <div className="min-h-full bg-app">
      <AdminHeader active={tab} subtitle={subtitle} />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {status === 'loading' ? <div className="skeleton h-64" aria-busy="true" /> : status === 'anon' ? <div className="card p-8 text-center text-sm text-muted">Loading your session…</div> : children}
      </main>
    </div>
  );
}
