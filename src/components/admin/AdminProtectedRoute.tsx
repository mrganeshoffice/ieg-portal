import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';

/** Blocks /admin/* unless a verified admin session exists. (The database enforces the same rule via RLS.) */
export default function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAdminAuth();
  const loc = useLocation();
  if (status === 'loading') return <div className="flex min-h-full items-center justify-center bg-app"><div className="skeleton h-24 w-24 !rounded-3xl" aria-busy="true" aria-label="Checking access" /></div>;
  if (status === 'anon') return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
